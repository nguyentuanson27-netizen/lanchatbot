import json
import sys
import urllib.request
import xml.etree.ElementTree as ET

FEED_URL = "https://www.lanadesign.vn/partner_feeds/danh-muc-lanadesign-vn.xml"
GOOGLE_NS = "http://base.google.com/ns/1.0"


def key_for(tag: str) -> str:
    if tag.startswith("{" + GOOGLE_NS + "}"):
        return "g:" + tag.split("}", 1)[1]
    return tag.split("}", 1)[-1]


def value_for(element: ET.Element):
    children = list(element)
    if not children:
        return (element.text or "").strip()
    result = {}
    for child in children:
        key = key_for(child.tag)
        value = value_for(child)
        if key in result:
            if not isinstance(result[key], list):
                result[key] = [result[key]]
            result[key].append(value)
        else:
            result[key] = value
    return result


request = urllib.request.Request(FEED_URL, headers={"User-Agent": "LaNa-ingestion-canonical-test/1.0"})
with urllib.request.urlopen(request, timeout=45) as response:
    raw = response.read()

root = ET.fromstring(raw)
channel = next((child for child in root if key_for(child.tag) == "channel"), None)
if channel is None:
    raise RuntimeError("RSS channel not found")

items = [value_for(child) for child in channel if key_for(child.tag) == "item"]
fixture = {"rss": {"channel": {"item": items}}}
with open(sys.argv[1], "w", encoding="utf-8") as output:
    json.dump(fixture, output, ensure_ascii=False, separators=(",", ":"))

print(json.dumps({"bytes": len(raw), "items": len(items), "output": sys.argv[1]}))
