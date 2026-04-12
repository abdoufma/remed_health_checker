const docx = require('docx');
const express = require("express");
const app = express(exports);

const { Document, Packer, Paragraph, Table, TableCell, TableRow } = docx;

app.get("/", async (req, res) => {
    const table = new Table({
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph("Hello")],
                    }),
                    new TableCell({
                        children: [],
                    }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({
                        children: [],
                    }),
                    new TableCell({
                        children: [new Paragraph("World")],
                    }),
                ],
            }),
        ],
    });
    
    const doc = new Document({
        sections: [{
            children: [table],
        }],
    });

    const b64string = await Packer.toBase64String(doc);
    
    res.setHeader('Content-Disposition', 'attachment; filename=My Document.docx');
    res.send(Buffer.from(b64string, 'base64'));
});

app.listen(3000)