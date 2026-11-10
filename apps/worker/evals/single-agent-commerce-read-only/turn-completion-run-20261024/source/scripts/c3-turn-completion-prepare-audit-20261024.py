from pathlib import Path
folder=Path(__file__).parent
s=(folder/'c3-acceptance-firewall-20261024.mjs').read_text(encoding='utf-8').replace('c3-acceptance-complete-20261024','c3-turn-completion-model-20261024')
s=s.replace("for(const job of ['b1','stateful','journey-openings','media-followup','negotiation','opening-quotes']){",
 "for(const job of readdirSync(root).filter(n=>['stateful','journey-openings','media-followup','negotiation','opening-quotes'].includes(n)||/^b1-\\d+-\\d+$/.test(n))){")
s=s.replace("job==='b1'","job.startsWith('b1-')")
(folder/'c3-turn-completion-firewall-20261024.mjs').write_text(s,encoding='utf-8')
