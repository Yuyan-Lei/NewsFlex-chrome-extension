(async () => {
    const targetLanguage = 'Simplified Chinese'; // TODO: get this from the storage
    const style = 'none' // TODO: get this from the storage
    const color = 'grey'

    function buildNode(isATag) {
        let translationParagraph;
        translationParagraph = document.createElement('p');
        translationParagraph.innerHTML = 'Translating...';
        translationParagraph.id = 'translation-section';

        if (!isATag) {
            switch (style) {
            case 'none':
                break;
            case 'italic':
                translationParagraph.style.fontStyle = 'italic';          
                break;
            case 'bold':
                translationParagraph.style.fontWeight = 'bold';          
                break;
            case 'underlined':
                translationParagraph.style.textDecorationLine = 'underline'; 
                translationParagraph.style.textDecorationColor = '#018abe';          
                break;
            case 'dashed-underlined':
                translationParagraph.style.textDecorationLine = 'underline';          
                translationParagraph.style.textDecorationColor = '#018abe'; 
                translationParagraph.style.textDecorationStyle = 'dashed';          
                break;
            case 'highlighted':
                translationParagraph.style.backgroundColor = 'yellow';         
                break;
            default:
                break;
            }
        }

        // Display color options:
        switch (color) {
            case 'none':      
            break;
            case 'grey':
            translationParagraph.style.color = 'grey';        
            break;
            case 'blue':
            translationParagraph.style.color = '#018abe';        
            break;
            case 'orange':
            translationParagraph.style.color = 'orange';        
            break;
            case 'red':
            translationParagraph.style.color = 'red';        
            break;
            case 'green':
            translationParagraph.style.color = 'green';        
            break;
            default:
            break;
        }

        return translationParagraph;
    }
    async function processNewNode(node, position) {
        // build node
        let newNode = buildNode(false);
        node.insertAdjacentElement(position, newNode);
        // translate text
        const response = await chrome.runtime.sendMessage({
            action: 'getTranslation',
            text: node.innerText,
            targetLanguage: targetLanguage,
        })
        const text = response.result;
        newNode.innerText = text;
    }

    async function processDropCapLetter(node) {
        let translation = '';
        let paragraphText = node.innerHTML;

        // build a new node
        let newNode = buildNode(false);
        node.insertAdjacentElement('beforeend', newNode);

        // remove bold tags
        const regexToRemoveBoldTag = /<b>\ <\/b>/g;
        paragraphText = paragraphText.replace(regexToRemoveBoldTag, "");
    
        const regex = /(<a[^>]*>.*?<\/a>)|[^<>]+/g;
        let match;
        while ((match = regex.exec(paragraphText)) !== null) {
            if (match[1]) {
                const regexATag = /(<a[^>]*>)(.*?)(<\/a>)/g;
                let openingTag, textBeforeTrans, closingTag;
                match[1].replace(regexATag, (match, before, text, after) => {
                    // get translation from API
                    openingTag = before;
                    textBeforeTrans = text;
                    closingTag = after;
                });
                const textResponse = await chrome.runtime.sendMessage({
                    action: 'getTranslation',
                    text: textBeforeTrans,
                    targetLanguage: targetLanguage,
                })
                const translatedText = textResponse.result;
                const result = ` ${openingTag}${translatedText}${closingTag} `;
                translation += result;
            } else if (match[0]) {
                // get translation from API
                const textResponse = await chrome.runtime.sendMessage({
                    action: 'getTranslation',
                    text: match[0],
                    targetLanguage: targetLanguage,
                })
                const translatedText = textResponse.result;
                translation += translatedText;
            }
        }
        newNode.innerHTML = translation;
    }

    async function processInterstitialLink(node) {
        // build a new node
        const newNode= buildNode(true);
        node.insertAdjacentElement("afterend", newNode);

        // translation
        const link = node.href;
        const text = node.innerText;
        // get translation from API
        const textResponse = await chrome.runtime.sendMessage({
            action: 'getTranslation',
            text: text,
            targetLanguage: targetLanguage,
        })
        const translatedText = textResponse.result;
        newNode.innerHTML = `<a href="${link}">${translatedText}</a>`;
    }

    async function traverseBodyNodes(node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches('span[data-qa="headline-text"]')) {
                await processNewNode(node, 'afterend');
            } else if (node.matches('h2[data-qa="subheadline"]')) {
                await processNewNode(node, 'beforeend');
            } else if (node.matches ('figcaption')) {
                await processNewNode(node, 'beforeend');
            } else if (node.matches('p[data-testid="drop-cap-letter"]')) {
                await processDropCapLetter(node);
            } else if (node.matches('a[data-qa="interstitial-link"]')) {
                await processInterstitialLink(node);
            }
        }
        for (const childNode of node.childNodes) {
            traverseBodyNodes(childNode);
        }
    }

    await traverseBodyNodes(document.body);
})();