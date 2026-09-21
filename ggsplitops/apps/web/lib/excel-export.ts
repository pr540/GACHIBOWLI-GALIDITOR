/**
 * Excel Export with Fractional Formulas for ggsplitops
 *
 * Generates an Excel XML spreadsheet (.xls) compatible with Excel, Google Sheets,
 * and Apple Numbers. Every split share uses active fractional formulas:
 * - Fraction: `=1/E{row}` (e.g. 1/15, 1/5)
 * - Share Per Person: `=ROUND(C{row}/E{row}, 2)`
 * - Member Share: Formula pointing to the per-person share or 0
 * - Totals & Balances: Native `=SUM(...)` formulas
 */

export interface ExportExpense {
  id: string;
  description: string;
  amount: string;
  currency: string;
  payerName: string;
  payerId: string;
  spentAt?: string;
  participants: { memberId: string; displayName: string }[];
  lastEditedByName?: string;
  lastEditedAt?: string;
}

export interface ExportMember {
  id: string;
  displayName: string;
  role?: string;
}

export function exportGroupToExcel({
  groupName,
  currency,
  members,
  expenses,
}: {
  groupName: string;
  currency: string;
  members: ExportMember[];
  expenses: ExportExpense[];
}) {
  const currencySymbol = currency === "INR" ? "₹" : currency;
  const filename = `ggsplitops-${groupName.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.xls`;

  // Start building XML Spreadsheet
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>ggsplitops</Author>
  <Title>${escapeXml(groupName)} - Expense Ledger</Title>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#0B0E0D"/>
   <Interior ss:Color="#E8B44A" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#131816" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#33403A"/>
   </Borders>
  </Style>
  <Style ss:ID="CurrencyCell">
   <NumberFormat ss:Format="&quot;${currencySymbol} &quot;#,##0.00"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="FractionCell">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Color="#5C6764"/>
  </Style>
  <Style ss:ID="TotalHeader">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#000000"/>
   <Interior ss:Color="#EDF2EF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#232C28"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#232C28"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalCurrency">
   <Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#059669"/>
   <Interior ss:Color="#EDF2EF" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="&quot;${currencySymbol} &quot;#,##0.00"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#232C28"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#232C28"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Expenses &amp; Splits">
  <Table ss:DefaultRowHeight="20">
   <Column ss:Width="90"/> <!-- Date -->
   <Column ss:Width="160"/> <!-- Description -->
   <Column ss:Width="110"/> <!-- Paid By -->
   <Column ss:Width="95"/> <!-- Total Amount -->
   <Column ss:Width="85"/> <!-- Involved Count -->
   <Column ss:Width="85"/> <!-- Fraction Formula -->
   <Column ss:Width="100"/> <!-- Share Each Formula -->
`;

  // Member columns
  members.forEach((m) => {
    xml += `   <Column ss:Width="105"/> <!-- ${escapeXml(m.displayName)} -->\n`;
  });

  // Row 1: Title
  const totalCols = 7 + members.length;
  xml += `   <Row ss:Height="30">
    <Cell ss:MergeAcross="${totalCols - 1}" ss:StyleID="Title">
     <Data ss:Type="String">ggsplitops — ${escapeXml(groupName)} Expense &amp; Split Breakdown</Data>
    </Cell>
   </Row>\n`;

  // Row 2: Headers
  xml += `   <Row ss:Height="24">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Date</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Expense Description</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Paid By</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Amount (${currencySymbol})</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Involved People</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Fraction Formula</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Share / Person</Data></Cell>\n`;

  members.forEach((m) => {
    const label = m.role === "OWNER" ? `${m.displayName} (Owner)` : m.displayName;
    xml += `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(label)}</Data></Cell>\n`;
  });
  xml += `   </Row>\n`;

  const startRow = 3;
  if (expenses.length === 0) {
    // If no expenses yet, provide a demonstrative example row with live formulas
    const r = startRow;
    xml += `   <Row>
    <Cell><Data ss:Type="String">Sample</Data></Cell>
    <Cell><Data ss:Type="String">SplitOps Team Dinner</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(members[0]?.displayName ?? "Zubair")}</Data></Cell>
    <Cell ss:StyleID="CurrencyCell"><Data ss:Type="Number">1500.00</Data></Cell>
    <Cell><Data ss:Type="Number">${members.length}</Data></Cell>
    <Cell ss:StyleID="FractionCell" ss:Formula="=CONCATENATE(&quot;1/&quot;, RC[-1])"><Data ss:Type="String">1/${members.length}</Data></Cell>
    <Cell ss:StyleID="CurrencyCell" ss:Formula="=ROUND(RC[-3]/RC[-2], 2)"><Data ss:Type="Number">${(1500 / members.length).toFixed(2)}</Data></Cell>\n`;

    members.forEach(() => {
      xml += `    <Cell ss:StyleID="CurrencyCell" ss:Formula="=RC7"><Data ss:Type="Number">${(1500 / members.length).toFixed(2)}</Data></Cell>\n`;
    });
    xml += `   </Row>\n`;
  } else {
    // Add real expense rows
    expenses.forEach((exp, idx) => {
      const rowNum = startRow + idx;
      const dateStr = exp.spentAt ? new Date(exp.spentAt).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
      const numAmount = parseFloat(exp.amount) || 0;
      const participantIds = new Set(exp.participants.map((p) => p.memberId));
      const involvedCount = participantIds.size > 0 ? participantIds.size : members.length;

      xml += `   <Row>
    <Cell><Data ss:Type="String">${escapeXml(dateStr)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(exp.description)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(exp.payerName)}</Data></Cell>
    <Cell ss:StyleID="CurrencyCell"><Data ss:Type="Number">${numAmount.toFixed(2)}</Data></Cell>
    <Cell><Data ss:Type="Number">${involvedCount}</Data></Cell>
    <Cell ss:StyleID="FractionCell" ss:Formula="=CONCATENATE(&quot;1/&quot;, RC[-1])"><Data ss:Type="String">1/${involvedCount}</Data></Cell>
    <Cell ss:StyleID="CurrencyCell" ss:Formula="=ROUND(RC[-3]/RC[-2], 2)"><Data ss:Type="Number">${(numAmount / involvedCount).toFixed(2)}</Data></Cell>\n`;

      members.forEach((m) => {
        const isInvolved = participantIds.size === 0 || participantIds.has(m.id);
        if (isInvolved) {
          // Point dynamically to Share / Person column (column 7)
          xml += `    <Cell ss:StyleID="CurrencyCell" ss:Formula="=RC7"><Data ss:Type="Number">${(numAmount / involvedCount).toFixed(2)}</Data></Cell>\n`;
        } else {
          xml += `    <Cell ss:StyleID="CurrencyCell"><Data ss:Type="Number">0.00</Data></Cell>\n`;
        }
      });
      xml += `   </Row>\n`;
    });
  }

  // Summary Totals Row with native =SUM(...) Excel formulas
  const lastRow = startRow + Math.max(expenses.length - 1, 0);
  xml += `   <Row ss:Height="24">
    <Cell ss:StyleID="TotalHeader"><Data ss:Type="String">TOTALS</Data></Cell>
    <Cell ss:StyleID="TotalHeader"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="TotalHeader"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="TotalCurrency" ss:Formula="=SUM(R${startRow}C4:R${lastRow}C4)"><Data ss:Type="Number">0</Data></Cell>
    <Cell ss:StyleID="TotalHeader"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="TotalHeader"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="TotalHeader"><Data ss:Type="String"></Data></Cell>\n`;

  members.forEach((_, mIdx) => {
    const colIdx = 8 + mIdx;
    xml += `    <Cell ss:StyleID="TotalCurrency" ss:Formula="=SUM(R${startRow}C${colIdx}:R${lastRow}C${colIdx})"><Data ss:Type="Number">0</Data></Cell>\n`;
  });
  xml += `   </Row>\n`;

  xml += `  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <Selected/>
   <Panes>
    <Pane>
     <Number>3</Number>
     <ActiveRow>2</ActiveRow>
    </Pane>
   </Panes>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;

  // Trigger browser download
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
