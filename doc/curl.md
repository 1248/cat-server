Command lines for curl
======================

Add new item

    curl -v --user MAGICKEY: http://localhost:8001/cat?href=blah -XPOST --header "Content-Type: application/json" --data '{"href":"blah", "i-object-metadata":[{"rel":"urn:X-tsbiot:rels:hasDescription:en","val":""}]}'

