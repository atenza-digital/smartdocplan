import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import type { BiReport, BiCompanyReport } from "./BiDashboard";

async function imagemComoDataUri(url: string): Promise<string | null> {
  try {
    const resposta = await fetch(url, { credentials: "include" });
    if (!resposta.ok) return null;
    const blob = await resposta.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const slug = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Gera o PDF no navegador; a biblioteca de PDF só é carregada ao clicar. */
export function BiExportButton({ report, global }: { report: BiReport | undefined; global: boolean }) {
  const [gerando, setGerando] = useState(false);

  const exportar = async () => {
    if (!report) return;
    setGerando(true);
    try {
      const [{ pdf }, { BiReportPdf }] = await Promise.all([import("@react-pdf/renderer"), import("./BiReportPdf")]);
      const empresa = global ? null : (report as BiCompanyReport).empresa;
      const companyLogo = empresa?.logoUrl ? await imagemComoDataUri(empresa.logoUrl) : null;
      const blob = await pdf(<BiReportPdf report={report} global={global} companyLogo={companyLogo} />).toBlob();
      const nome = `bi-${global ? "global" : slug(empresa?.nome ?? "empresa")}-${report.periodo.inicio}-a-${report.periodo.fim}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nome;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success("Relatório em PDF gerado.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <Button onClick={exportar} disabled={!report || gerando} className="bg-primary hover:bg-primary/90 text-primary-foreground">
      <FileDown className="w-4 h-4 mr-2" />
      {gerando ? "Gerando PDF..." : "Exportar PDF"}
    </Button>
  );
}
