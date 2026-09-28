import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
const doc = new jsPDF();
doc.text("Date Range: … – …   •   —", 14, 18);
autoTable(doc, { head: [["A","B"]], body: [["—","x"]] });
const out = doc.output();
console.log("ok", out.length, /Date Range: (.{0,30})/.exec(out)?.[0]);
