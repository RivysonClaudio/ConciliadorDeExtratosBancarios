class NaiveBayes {
    constructor() {
        this.categories = new Map();
        this.totalDocuments = 0;
        this.vocabulary = new Set();
        this.documentFrequency = new Map();
        this.smoothingFactor = 1;
        this.blacklist = new Map(); // categoria -> Set de tokens que NÃO pertencem a ela
        
        this.stopWords = new Set([
            'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos',
            'para', 'por', 'com', 'sem', 'sob', 'sobre', 'entre', 'ate',
            'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
            'e', 'ou', 'mas', 'porem', 'contudo', 'todavia',
            'que', 'qual', 'quais', 'quanto', 'quantos',
            'se', 'ao', 'aos', 'pela', 'pelo', 'pelas', 'pelos',
            'este', 'esta', 'estes', 'estas', 'esse', 'essa', 'esses', 'essas',
            'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'isso', 'aquilo',
            'seu', 'sua', 'seus', 'suas', 'nosso', 'nossa', 'nossos', 'nossas',
            'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas',
            'ele', 'ela', 'eles', 'elas', 'voce', 'voces', 'nos', 'eu', 'tu',
            'foi', 'ser', 'sido', 'sendo', 'ter', 'tendo', 'tido',
            'esta', 'estao', 'estava', 'estavam', 'estive', 'esteve',
            'ha', 'havia', 'houve', 'havera', 'haveria',
            'ja', 'ainda', 'agora', 'antes', 'depois', 'sempre', 'nunca',
            'muito', 'pouco', 'mais', 'menos', 'bem', 'mal',
            'sim', 'nao', 'talvez', 'apenas', 'somente', 'so',
            'como', 'quando', 'onde', 'porque', 'pois', 'entao', 'assim',
            'cada', 'todo', 'toda', 'todos', 'todas', 'algum', 'alguma',
            'nenhum', 'nenhuma', 'outro', 'outra', 'outros', 'outras',
            'mesmo', 'mesma', 'mesmos', 'mesmas', 'proprio', 'propria',
            'ltda', 'sa', 's', 'me', 'epp', 'eireli', 'cnpj', 'cpf',
            'ref', 'nf', 'doc', 'ted', 'pix', 'tev', 'deb', 'cred',
            'ag', 'cc', 'conta', 'banco', 'bco', 'cta'
        ]);
    }

    normalizeText(text) {
        let normalized = text.toLowerCase();
        
        normalized = normalized
            .replace(/[áàâãä]/g, 'a')
            .replace(/[éèêë]/g, 'e')
            .replace(/[íìîï]/g, 'i')
            .replace(/[óòôõö]/g, 'o')
            .replace(/[úùûü]/g, 'u')
            .replace(/[ç]/g, 'c')
            .replace(/[ñ]/g, 'n');
        
        normalized = normalized.replace(/\b\d{5,}\b/g, '');
        normalized = normalized.replace(/\b\d{2}[\/.]\d{2}[\/.]\d{2,4}\b/g, '');
        normalized = normalized.replace(/\b\d{1,2}:\d{2}\b/g, '');
        
        return normalized;
    }

    stem(word) {
        if (word.length <= 3) return word;
        
        let stemmed = word;
        
        const suffixes = [
            'amento', 'imento', 'adora', 'mente', 'encia', 'ancia',
            'avel', 'ivel', 'oso', 'osa', 'ico', 'ica',
            'ando', 'endo', 'indo', 'ado', 'ido', 'ada', 'ida',
            'acao', 'icao', 'ucao',
            'ores', 'oras', 'ador', 'edor', 'idor',
            'ante', 'ente', 'inte',
            'ais', 'eis', 'ois', 'uis',
            'es', 'as', 'os', 'is', 'us',
            'ar', 'er', 'ir',
            's'
        ];
        
        for (const suffix of suffixes) {
            if (stemmed.length > suffix.length + 2 && stemmed.endsWith(suffix)) {
                stemmed = stemmed.slice(0, -suffix.length);
                break;
            }
        }
        
        return stemmed.length >= 2 ? stemmed : word;
    }

    tokenize(phrase) {
        const normalized = this.normalizeText(phrase);
        const rawWords = normalized.match(/\b[a-z]{2,}\b/g) || [];
        
        const words = rawWords
            .filter(word => !this.stopWords.has(word))
            .map(word => this.stem(word))
            .filter(word => word.length >= 2);
        
        return words;
    }

    generateNgrams(words, n = 2) {
        const ngrams = [...words];
        
        for (let i = 0; i < words.length - n + 1; i++) {
            ngrams.push(words.slice(i, i + n).join('_'));
        }
        
        return ngrams;
    }

    train(phrase, category) {
        if (!this.categories.has(category)) {
            this.categories.set(category, { wordCounts: new Map(), totalWords: 0, docCount: 0 });
        }

        const categoryData = this.categories.get(category);
        const words = this.tokenize(phrase);
        const features = this.generateNgrams(words, 2);
        
        const uniqueWords = new Set(features);
        uniqueWords.forEach(word => {
            this.documentFrequency.set(word, (this.documentFrequency.get(word) || 0) + 1);
        });

        features.forEach(word => {
            this.vocabulary.add(word);
            categoryData.wordCounts.set(word, (categoryData.wordCounts.get(word) || 0) + 1);
            categoryData.totalWords++;
        });

        categoryData.docCount++;
        this.totalDocuments++;
    }

    penalize(phrase, wrongCategory) {
        if (!this.categories.has(wrongCategory)) return;

        const categoryData = this.categories.get(wrongCategory);
        const words = this.tokenize(phrase);
        const features = this.generateNgrams(words, 2);

        // Adicionar tokens à blacklist da categoria
        if (!this.blacklist.has(wrongCategory)) {
            this.blacklist.set(wrongCategory, new Set());
        }
        const categoryBlacklist = this.blacklist.get(wrongCategory);

        features.forEach(word => {
            // Adicionar à blacklist
            categoryBlacklist.add(word);
            
            // Também reduzir o peso (comportamento original)
            const count = categoryData.wordCounts.get(word) || 0;
            if (count > 0) {
                categoryData.wordCounts.set(word, count - 1);
                categoryData.totalWords--;
            }
        });

        if (categoryData.docCount > 0) {
            categoryData.docCount--;
            this.totalDocuments--;
        }
    }

    calculateTFIDF(word, categoryData) {
        const tf = (categoryData.wordCounts.get(word) || 0) / (categoryData.totalWords || 1);
        const df = this.documentFrequency.get(word) || 1;
        const idf = Math.log((this.totalDocuments + 1) / (df + 1)) + 1;
        return tf * idf;
    }

    classify(phrase, threshold = 0.4) {
        const words = this.tokenize(phrase);
        const features = this.generateNgrams(words, 2);
        
        if (this.categories.size === 0 || this.totalDocuments === 0) return null;
        
        let categoryProbabilities = new Map();
        let sumExp = 0;
        let maxLog = -Infinity;

        for (const [category, data] of this.categories.entries()) {
            if (data.docCount === 0) continue;
            
            let categoryProbability = Math.log(data.docCount / this.totalDocuments);
            
            // Verificar blacklist - penalidade forte se tokens estão na blacklist
            const categoryBlacklist = this.blacklist.get(category);
            let blacklistPenalty = 0;
            
            if (categoryBlacklist) {
                features.forEach(word => {
                    if (categoryBlacklist.has(word)) {
                        blacklistPenalty += 2.0; // Penalidade forte por cada token na blacklist
                    }
                });
            }

            features.forEach(word => {
                const wordCount = data.wordCounts.get(word) || 0;
                const tfidfBoost = this.calculateTFIDF(word, data);
                const smoothedCount = wordCount + this.smoothingFactor;
                const smoothedTotal = data.totalWords + (this.vocabulary.size * this.smoothingFactor);
                const wordProbability = Math.log(smoothedCount / smoothedTotal);
                categoryProbability += wordProbability * (1 + tfidfBoost * 0.5);
            });
            
            // Aplicar penalidade da blacklist
            categoryProbability -= blacklistPenalty;

            categoryProbabilities.set(category, categoryProbability);
            if (categoryProbability > maxLog) {
                maxLog = categoryProbability;
            }
        }

        if (maxLog === -Infinity) return null;

        for (const [category, logProb] of categoryProbabilities.entries()) {
            categoryProbabilities.set(category, Math.exp(logProb - maxLog));
            sumExp += categoryProbabilities.get(category);
        }

        let bestCategory = null;
        let maxProbability = 0;
        for (const [category, prob] of categoryProbabilities.entries()) {
            const normalizedProb = prob / sumExp;
            if (normalizedProb > maxProbability) {
                maxProbability = normalizedProb;
                bestCategory = category;
            }
        }

        return maxProbability >= threshold ? bestCategory : null;
    }

    toJSON() {
        const categories = {};
        for (const [category, data] of this.categories.entries()) {
            categories[category] = {
                wordCounts: Object.fromEntries(data.wordCounts),
                totalWords: data.totalWords,
                docCount: data.docCount
            };
        }
        
        const blacklist = {};
        for (const [category, tokens] of this.blacklist.entries()) {
            blacklist[category] = Array.from(tokens);
        }

        return JSON.stringify({
            categories,
            totalDocuments: this.totalDocuments,
            vocabulary: Array.from(this.vocabulary),
            documentFrequency: Object.fromEntries(this.documentFrequency),
            blacklist
        });
    }

    fromJSON(json) {
        if (!json || (typeof json === 'string' && json.length === 0)) return;
        if (typeof json === 'object' && !json.categories) return;
        
        const data = typeof json === "string" ? JSON.parse(json) : json;

        this.categories = new Map();
        for (const [category, catData] of Object.entries(data.categories)) {
            this.categories.set(category, {
                wordCounts: new Map(Object.entries(catData.wordCounts)),
                totalWords: catData.totalWords,
                docCount: catData.docCount
            });
        }

        this.totalDocuments = data.totalDocuments;
        this.vocabulary = new Set(data.vocabulary);
        
        if (data.documentFrequency) {
            this.documentFrequency = new Map(Object.entries(data.documentFrequency));
        } else {
            this.rebuildDocumentFrequency();
        }
        
        // Carregar blacklist
        this.blacklist = new Map();
        if (data.blacklist) {
            for (const [category, tokens] of Object.entries(data.blacklist)) {
                this.blacklist.set(category, new Set(tokens));
            }
        }
    }

    rebuildDocumentFrequency() {
        this.documentFrequency = new Map();
        for (const [, data] of this.categories.entries()) {
            for (const [word] of data.wordCounts.entries()) {
                this.documentFrequency.set(word, (this.documentFrequency.get(word) || 0) + 1);
            }
        }
    }

    reset() {
        this.categories = new Map();
        this.totalDocuments = 0;
        this.vocabulary = new Set();
        this.documentFrequency = new Map();
        this.blacklist = new Map();
    }

    optimize(minDocsPerCategory = 5, minWordOccurrences = 2) {
        let removedCategories = 0;
        let removedWords = 0;
        let balancedCategories = 0;

        const categoriesToRemove = [];
        for (const [category, data] of this.categories.entries()) {
            if (data.docCount < minDocsPerCategory) {
                categoriesToRemove.push(category);
            }
        }

        for (const category of categoriesToRemove) {
            const data = this.categories.get(category);
            this.totalDocuments -= data.docCount;
            this.categories.delete(category);
            removedCategories++;
        }

        const wordCategoryCount = new Map();
        for (const [, data] of this.categories.entries()) {
            for (const [word] of data.wordCounts.entries()) {
                wordCategoryCount.set(word, (wordCategoryCount.get(word) || 0) + 1);
            }
        }

        const totalCategories = this.categories.size;
        const maxCategoryRatio = 0.8;
        const wordsToRemove = [];
        
        for (const [word, catCount] of wordCategoryCount.entries()) {
            if (catCount < minWordOccurrences) {
                wordsToRemove.push(word);
            }
            if (totalCategories > 5 && catCount / totalCategories > maxCategoryRatio) {
                wordsToRemove.push(word);
            }
        }

        for (const word of wordsToRemove) {
            this.vocabulary.delete(word);
            this.documentFrequency.delete(word);
            for (const [, data] of this.categories.entries()) {
                if (data.wordCounts.has(word)) {
                    data.totalWords -= data.wordCounts.get(word);
                    data.wordCounts.delete(word);
                }
            }
            removedWords++;
        }

        if (this.categories.size > 0) {
            const avgDocs = this.totalDocuments / this.categories.size;
            const maxDocs = avgDocs * 3;
            
            for (const [, data] of this.categories.entries()) {
                if (data.docCount > maxDocs) {
                    const scaleFactor = maxDocs / data.docCount;
                    for (const [word, count] of data.wordCounts.entries()) {
                        data.wordCounts.set(word, Math.round(count * scaleFactor));
                    }
                    data.totalWords = Math.round(data.totalWords * scaleFactor);
                    balancedCategories++;
                }
            }
        }

        this.vocabulary = new Set();
        for (const [, data] of this.categories.entries()) {
            for (const [word] of data.wordCounts.entries()) {
                this.vocabulary.add(word);
            }
        }

        this.rebuildDocumentFrequency();

        return { removedCategories, removedWords, balancedCategories };
    }

    getStats() {
        const categories = this.categories.size;
        const documents = this.totalDocuments;
        const vocabulary = this.vocabulary.size;
        
        if (categories === 0) return { 
            avgDocsPerCategory: 0, 
            weakCategories: 0, 
            suggestedThreshold: 0.4,
            ngramCount: 0,
            stopWordsActive: true
        };

        const avgDocsPerCategory = documents / categories;
        
        let weakCategories = 0;
        let ngramCount = 0;
        for (const [, data] of this.categories.entries()) {
            if (data.docCount < 3) weakCategories++;
        }
        
        for (const word of this.vocabulary) {
            if (word.includes('_')) ngramCount++;
        }

        // Threshold focado em PRECISÃO (valores mais altos = menos classificações, mas mais corretas)
        let suggestedThreshold = 0.6;
        if (avgDocsPerCategory >= 15) {
            suggestedThreshold = 0.5;
        } else if (avgDocsPerCategory >= 10) {
            suggestedThreshold = 0.55;
        } else if (avgDocsPerCategory >= 5) {
            suggestedThreshold = 0.6;
        } else if (avgDocsPerCategory >= 3) {
            suggestedThreshold = 0.65;
        } else {
            suggestedThreshold = 0.7;
        }

        // Contar tokens na blacklist
        let blacklistCount = 0;
        for (const [, tokens] of this.blacklist.entries()) {
            blacklistCount += tokens.size;
        }

        return { 
            avgDocsPerCategory, 
            weakCategories, 
            suggestedThreshold,
            ngramCount,
            stopWordsActive: true,
            blacklistCount,
            categoriesWithBlacklist: this.blacklist.size
        };
    }
}
