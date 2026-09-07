#!/usr/bin/env python3
"""Importe les tickets de tickets/*.md dans Linear.

Usage :
    python3 scripts/linear-import.py teams              # liste tes équipes
    python3 scripts/linear-import.py plan  --team ENG   # montre ce qui serait créé
    python3 scripts/linear-import.py apply --team ENG   # crée pour de vrai

La clé API est lue dans ~/.bruno-linear-key et n'est jamais affichée.
"""
import json, os, re, sys, urllib.request, pathlib

API = "https://api.linear.app/graphql"
ROOT = pathlib.Path(__file__).resolve().parent.parent
KEYFILE = pathlib.Path.home() / ".bruno-linear-key"


def key():
    if not KEYFILE.exists():
        sys.exit(f"Clé absente. Crée {KEYFILE} avec ta clé API Linear "
                 "(Linear → Settings → Security & access → Personal API keys), "
                 f"puis : chmod 600 {KEYFILE}")
    k = KEYFILE.read_text().strip()
    if not k:
        sys.exit(f"{KEYFILE} est vide.")
    return k


def gql(query, variables=None):
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(API, data=body, headers={
        "Content-Type": "application/json", "Authorization": key()})
    try:
        with urllib.request.urlopen(req) as r:
            out = json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} — {e.read().decode()[:300]}")
    if "errors" in out:
        sys.exit("Erreur API : " + json.dumps(out["errors"])[:500])
    return out["data"]


def parse():
    """Lit tickets/E*.md → [{id, title, epic, body, blocked_by, priority}]"""
    tickets = []
    for f in sorted((ROOT / "tickets").glob("E*.md")):
        text = f.read_text()
        epic = text.split("\n", 1)[0].lstrip("# ").split(" · ")[0].strip()
        for block in text.split("\n## ")[1:]:
            head, _, body = block.partition("\n")
            m = re.match(r"(BRU-\d+)\s+—\s+(.+)", head.strip())
            if not m:
                continue
            tid, rest = m.group(1), m.group(2)
            title = rest.split(" · ")[0].strip()
            title = re.sub(r"\s*\*+\(.*?\)\**\s*$", "", title).strip().strip("*").strip()
            blocked = re.findall(r"bloqu[ée] par (BRU-\d+)", head)
            tickets.append({
                "id": tid, "title": f"{tid} — {title}", "epic": epic,
                "slug": f.stem, "body": body.strip(),
                "blocked_by": blocked,
                "priority": 1 if "prioritaire" in head else 0,
            })
    return tickets


def cmd_teams():
    d = gql("{ viewer { name email } teams { nodes { id key name } } }")
    print(f"Connecté : {d['viewer']['name']} <{d['viewer']['email']}>\n")
    for t in d["teams"]["nodes"]:
        print(f"  {t['key']:<8} {t['name']}")
    print("\nRelance avec --team <CLÉ>")


def cmd_plan(team_key, tickets):
    epics = {}
    for t in tickets:
        epics.setdefault(t["epic"], []).append(t)
    print(f"Cible : équipe {team_key} · projet « Bruno V1 »")
    print(f"{len(tickets)} issues, {len(epics)} labels d'épique\n")
    for e, ts in epics.items():
        print(f"  {e}  ({len(ts)})")
        for t in ts:
            flags = []
            if t["blocked_by"]: flags.append("bloqué par " + ", ".join(t["blocked_by"]))
            if t["priority"] == 1: flags.append("urgent")
            print(f"      {t['title']}" + (f"   [{' · '.join(flags)}]" if flags else ""))
    print("\nRien n'a été créé. Relance avec `apply` pour écrire dans Linear.")


def cmd_apply(team_key, tickets):
    teams = gql("{ teams { nodes { id key } } }")["teams"]["nodes"]
    team = next((t for t in teams if t["key"] == team_key), None)
    if not team:
        sys.exit(f"Équipe {team_key} introuvable. Lance `teams` pour la liste.")
    tid = team["id"]

    # sans stateId explicite, une issue créée par l'API atterrit dans Triage
    # et reste invisible dans la vue projet : on vise l'état backlog de l'équipe.
    states = gql("""query($t:String!){ team(id:$t){ states { nodes { id type position } } } }""",
                 {"t": tid})["team"]["states"]["nodes"]
    backlog = sorted([s for s in states if s["type"] == "backlog"],
                     key=lambda s: s["position"])
    state_id = backlog[0]["id"] if backlog else None

    proj = gql("""mutation($n:String!,$t:[String!]!){
        projectCreate(input:{name:$n, teamIds:$t}){ project { id url } } }""",
        {"n": "Bruno V1", "t": [tid]})["projectCreate"]["project"]
    print(f"Projet créé : {proj['url']}")

    labels = {}
    for epic in dict.fromkeys(t["epic"] for t in tickets):
        r = gql("""mutation($n:String!,$t:String!){
            issueLabelCreate(input:{name:$n, teamId:$t}){ issueLabel { id } } }""",
            {"n": epic, "t": tid})
        labels[epic] = r["issueLabelCreate"]["issueLabel"]["id"]
    print(f"{len(labels)} labels créés")

    created = {}
    for t in tickets:
        r = gql("""mutation($i:IssueCreateInput!){
            issueCreate(input:$i){ issue { id identifier url } } }""",
            {"i": {"teamId": tid, "projectId": proj["id"], "title": t["title"],
                   "description": f"**{t['epic']}**\n\n{t['body']}",
                   "labelIds": [labels[t["epic"]]],
                   **({"stateId": state_id} if state_id else {}),
                   **({"priority": 1} if t["priority"] == 1 else {})}})
        iss = r["issueCreate"]["issue"]
        created[t["id"]] = iss["id"]
        print(f"  {iss['identifier']}  {t['title']}")

    rel = 0
    for t in tickets:
        for b in t["blocked_by"]:
            if b in created:
                gql("""mutation($a:String!,$b:String!){
                    issueRelationCreate(input:{issueId:$a, relatedIssueId:$b, type:blocks}){ success } }""",
                    {"a": created[b], "b": created[t["id"]]})
                rel += 1
    print(f"\n{len(created)} issues, {rel} relations de blocage.\n{proj['url']}")


if __name__ == "__main__":
    args = sys.argv[1:]
    cmd = args[0] if args else "plan"
    team = args[args.index("--team") + 1] if "--team" in args else None
    if cmd == "teams":
        cmd_teams()
    else:
        ts = parse()
        if not ts:
            sys.exit("Aucun ticket trouvé dans tickets/E*.md")
        if not team:
            sys.exit("Précise --team <CLÉ>. Lance `teams` pour la liste.")
        (cmd_apply if cmd == "apply" else cmd_plan)(team, ts)
