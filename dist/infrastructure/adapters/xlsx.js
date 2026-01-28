import * as XLSX from "xlsx";
export class XlsxAdapter {
    async extractPages(buffer) {
        const workbook = XLSX.read(buffer, { type: "array" });
        const pages = [];
        for (let i = 0; i < workbook.SheetNames.length; i++) {
            const sheetName = workbook.SheetNames[i];
            if (!sheetName)
                continue;
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet)
                continue;
            // Convert sheet to text format
            const text = XLSX.utils.sheet_to_txt(worksheet);
            pages.push({
                pageNumber: i + 1,
                content: `## Sheet: ${sheetName}\n\n${text}`,
            });
        }
        return pages.length > 0 ? pages : [{ pageNumber: 1, content: "" }];
    }
}
//# sourceMappingURL=xlsx.js.map