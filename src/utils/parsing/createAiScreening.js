function createAiScreening(zotobject) {
    return zotobject.map((item) => {
        const extra = item.extra || '';
        const lines = extra.split('\n');
        const id = lines.find((line) => line.startsWith('id:')).split('id:')[1].trim();
        const keywordsString = lines.find((line) => line.startsWith('keywords:'));
        const keywords = keywordsString ? keywordsString.split('keywords:')[1].split(',').map((keyword) => keyword.trim()) : [];
        return {
            id,
            title: item.title,
            abstract: item.abstractNote,
            keywords,
        };
    });
}

module.exports = { createAiScreening };