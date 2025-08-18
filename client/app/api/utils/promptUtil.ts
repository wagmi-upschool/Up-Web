export function replacePatterns(text:string) {
    const signs = ["\\]\\*\\*\\*\\]", "\\[\\*\\*\\*\\]", "\\*\\*", "\\[\\*\\*:\\]", "\\[\\*\\*::\\]", "\\[\\*\\*\\.\\]", "\\[\\*\\*\\.\\.\\]","\\[\\*\\.\\*\\]"];
    const regex = new RegExp(signs.join("|"), "g");
    return text.replace(regex, '');
}

function escapeRegExp(string: string): string {
    // RegExp.escape function that escapes all special characters for RegExp
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');  // $& means the whole matched string
}

export function getStaticItem(text:string,signTemplate:string) {
    const sign = escapeRegExp(signTemplate);
    // Create a regular expression to match the pattern
    const regex = new RegExp(`${sign}(.+?)${sign}`);
    // Execute the regex on the title string
    const match = regex.exec(text);
    // Check if a match is found and output it
    if (match && match[1]) {
       return match[1];
    } else {
       return undefined;
    }
}

function parseSection(text:string,sectionTitle:string,sectionKey:any) {
    const sectionPattern = new RegExp(`\\[\\[${sectionKey}\\]\\](.*?)(?=\\[\\[|$)`, 's');
    const sectionMatch = sectionPattern.exec(text);
    const sectionContent = sectionMatch ? sectionMatch[1] : "";
    const parsedContentSection = {
        title: sectionTitle,
        values: [],

    };
    return { parsedContentSection, sectionContent};
}

function parseNameValueList(content:any,signTable:any,parsedSection:any) {
    let section = {...parsedSection};
    const starterPattern = new RegExp(`${escapeRegExp(signTable.starter)}(.*?)${escapeRegExp(signTable.starter)}`, 'g');
    const valuePattern = new RegExp(`${escapeRegExp(signTable.value)}(.*?)${escapeRegExp(signTable.value)}`, 'g');
    let matchStarters: RegExpExecArray | null;
    let matchValues: RegExpExecArray | null;
    const starters: string[] = [];
    const values: string[] = [];
    while ((matchStarters = starterPattern.exec(content)) !== null) {
        starters.push(matchStarters[1].trim());
    }

    while ((matchValues = valuePattern.exec(content)) !== null) {
        values.push(matchValues[1].trim());
    }
    for (let j = 0; j < starters.length; j++) {
        section.values.push({
            title:starters[j],
            starter: starters[j],
            value: values[j]
        });
    }
    return section;
}

function parseSubtitleListWithHeading(content:any,signTable:any,parsedSection:any) {
    let section = { ...parsedSection };
    const listItems: any = [];
    let currentTitle: string = '';
    let currentValues: string[] = [];

    // Split the input by the pattern [**.]...[**.] to get each title and its content
    const sections = content.split(/\[\*\*.\]([\s\S]*?)\[\*\*.\]/);
    for (let i = 1; i < sections.length; i += 2) {
        if (!sections[i].startsWith('**')) {
            currentTitle = sections[i].trim();
            currentValues = (sections[i+1]) != undefined ? sections[i + 1].split(/\[\*\*..\]/).filter((item:any) => item.trim() !== '') : [];
            listItems.push({ title: currentTitle, values: currentValues });
        }
    }
    section["values"] = listItems;
    return section;
}

function parseLongText(content:any,signTable:any,parsedSection:any) {
    let section = { ...parsedSection };
    const valuePattern = new RegExp(`${escapeRegExp(signTable.value)}(.*?)${escapeRegExp(signTable.value)}`, 'g');
    let matchValues: RegExpExecArray | null;
    while ((matchValues = valuePattern.exec(content)) !== null) {
        section.values.push(matchValues[1].trim());
    }
    return section;
}

export function parseText(text: string, signTable: any,config:any) {
    const { parsedContentSection, sectionContent} = parseSection(text,config.title,config.key);
    const configType = config.type;
    switch (configType) {
        case "name-value-list":
            let result = parseNameValueList(sectionContent, signTable[configType], parsedContentSection);
            return result;
        case "sub-title-list-with-heading":
            let subTitleListWithHeading = parseSubtitleListWithHeading(sectionContent, signTable[configType], parsedContentSection);
            return subTitleListWithHeading;
        case "long-text":
            let longText = parseLongText(sectionContent, signTable[configType], parsedContentSection);
            return longText;
        default:
            return null;
    }
}

export function toCamelCase(str: string): string {
    return str
        .toLowerCase()
        .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) =>
            index === 0 ? match.toLowerCase() : match.toUpperCase()
        )
        .replace(/\s+/g, '');
};

export function buildType(object:any,signTable:any,type:any) {
    const configType = type;
    const signs = signTable[object.type];
    switch (configType) {
        case "name-value-list":
            return `${object.value.map((titleValueList: any, index: number) => `${index === 0 ? '    ' : ''}${signs.starter}${titleValueList.starter}${signs.starter}${signs.value}${titleValueList.value}${signs.value} `).join("\n    ")}`
        case "sub-title-list-with-heading":
            return `${object.value.map((value: any) => 
            `${signs["subTitle"]}${value.title}${signs["subTitle"]}
${value.values.map((value: any, index: number) => `${index === 0 ? '    ' : ''}${signs["subList"]}${value}${signs["subList"]} `).join("\n    ")} `).join("\n")}`
        case "long-text":
            return  `${object.value.map((value: any) => 
            `${signs["value"]}${value}${signs["value"]}`).join("\n    ")} `;
        default:
            return "";
    }
}

export function buildText(formTemplate:any,signTable:any,data:any) {
    const header = `${signTable["header"]}`;
    const subHeader = `${signTable["subHeader"]}`;
    const listTemplate = formTemplate.map((assistantItem: any) =>
        `[[${assistantItem.key}]]${signTable[assistantItem.type]["title"]}${assistantItem.title}${signTable[assistantItem.type]["title"]}
${buildType(assistantItem, signTable, assistantItem.type)}[[${assistantItem.key}]] \n`).join("\n");
    const prompt = `${header}${data.title}${header}\n

${subHeader}${data.instructionDescription}${subHeader}\n

${listTemplate}`;
   return prompt;
    
}


