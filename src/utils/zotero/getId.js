function getId(item, source) {
    if (source === 'openalex') {
        return "openalex:" + (item.ids.openalex || "").split("/").pop() || "";
    } else if (source === 'scholarly') {
      let ids = [];
      if (item.url_scholarbib) {
          const match = item.url_scholarbib.match(/info:(?<id>[^:]+):/);
          if (match && match.groups.id) {
              ids.push(match.groups.id);
          }
      }
      if (item.citedby_url) {
          const match = item.citedby_url.match(/cites=(?<id>[0-9]+)/);
          if (match && match.groups.id) {
              ids.push(match.groups.id);
          }
      }
      return "GoogleScholar:" + ids.join(":");
    } else if (source === 'scopus') {
      return "scopus:" + (item["dc:identifier"] || "").split(":")[1] || "";
    } else if (source === 'scite') {
        return "scite:" + (item.id || "");
    } else {
        console.log('unknown source');
        return;
    }
}

module.exports = { getId };
