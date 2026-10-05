from __future__ import annotations

import importlib.util
from pathlib import Path
import sys

from reportlab.platypus import KeepTogether, PageBreak, SimpleDocTemplate, Spacer, Table, TableStyle

from generate_relatorio_acompanhamento_smartdocplan import (
    CURRENT_STATUS,
    EXECUTIVE_CARDS,
    NEXT_STEPS,
    PROJECT_SHEET,
    SUGGESTIONS,
    VERSION_HISTORY,
)


ROOT = Path(r"C:\Projetos\Atenza\smartdocplan")
GENERATOR_PATH = Path(r"C:\Projetos\Documentações\02_Templates\gerar_templates_oficiais_atenza.py")
OUTPUT_PDF = ROOT / "docs" / "cliente" / "Relatorio_Acompanhamento_SmartDocPlan_Melhorias_Atenza_v1.0_2026-07-14.pdf"


def load_generator_module():
    spec = importlib.util.spec_from_file_location("atenza_templates_generator", GENERATOR_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError("Não foi possível carregar o gerador oficial de templates da Atenza.")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def field_list():
    ordered = []
    for row in range(5):
        for col in range(3):
            if (row, col) in PROJECT_SHEET:
                ordered.append(PROJECT_SHEET[(row, col)])
    return ordered


def custom_spec(gen):
    return gen.TemplateSpec(
        category="01_Operacionais",
        filename="Template_Relatorio_Acompanhamento_Projeto_Atenza",
        title="Relatório de Acompanhamento do Projeto",
        subtitle="SmartDocPlan: sugestões Atenza para evolução funcional, experiência de uso e valor percebido na versão final.",
        audience="Externo.",
        signature="Normalmente ciência por e-mail/WhatsApp; assinatura apenas quando virar aceite ou marco formal.",
        summary="Relatório executivo com recomendações Atenza para apoiar a rodada final de validação do SmartDocPlan.",
        sections=[
            gen.SectionSpec(
                "1. Resumo executivo",
                body=[
                    "A Atenza realizou uma análise interna do SmartDocPlan com foco em experiência de uso, clareza operacional, valor percebido e aderência ao propósito da ferramenta.",
                    "A plataforma já possui uma base relevante para gestão de solicitações, documentos, requisitos legais, operação multiempresa e acompanhamento de rotinas de RH. Este material consolida oportunidades percebidas pela equipe Atenza como complemento à rodada de validação prevista com a SmartDocPlan em 21/07/2026.",
                ],
            ),
            gen.SectionSpec(
                "2. Situação atual",
                table=[
                    ["Frente", "Status", "Observação"],
                    *[list(row) for row in CURRENT_STATUS],
                ],
            ),
            gen.SectionSpec(
                "3. Sugestões Atenza para a versão final",
                bullets=SUGGESTIONS,
            ),
            gen.SectionSpec(
                "4. Próximos passos para validação",
                table=[
                    ["Pendência", "Responsável", "Próxima ação", "Prazo"],
                    *[list(row) for row in NEXT_STEPS],
                ],
            ),
            gen.SectionSpec(
                "5. Observação de rotina",
                note=(
                    "Este material foi preparado pela Atenza como complemento proativo à rodada de validação do projeto. "
                    "A intenção é agregar valor à versão final do SmartDocPlan, registrando oportunidades percebidas internamente "
                    "antes do alinhamento conjunto previsto para 21/07/2026."
                ),
            ),
        ],
    )


def build_pdf(gen) -> Path:
    gen.register_fonts()
    watermark = gen.make_watermark()
    spec = custom_spec(gen)

    original_profile_for = gen.profile_for

    def patched_profile_for(_spec):
        if _spec.filename == "Template_Relatorio_Acompanhamento_Projeto_Atenza":
            return {
                "fields": field_list(),
                "cards": [
                    ("STATUS", EXECUTIVE_CARDS[0]),
                    ("PRÓXIMA AÇÃO", EXECUTIVE_CARDS[1]),
                    ("DECISÃO AGUARDADA", EXECUTIVE_CARDS[2]),
                ],
            }
        return original_profile_for(_spec)

    gen.profile_for = patched_profile_for

    doc = SimpleDocTemplate(
        str(OUTPUT_PDF),
        pagesize=gen.A4,
        leftMargin=gen.PDF_LEFT_MARGIN,
        rightMargin=gen.PDF_RIGHT_MARGIN,
        topMargin=3.45 * gen.cm,
        bottomMargin=2.85 * gen.cm,
    )
    styles = gen.get_styles()

    story = [
        gen.p("DOCUMENTO INSTITUCIONAL", styles["label"]),
        gen.p(spec.title, styles["title"]),
        gen.p(spec.subtitle, styles["subtitle"]),
        gen.HeaderRule(gen.CONTENT_WIDTH),
        Spacer(1, 0.30 * gen.cm),
    ]
    story.extend(gen.build_project_sheet(styles, spec))
    story.extend(gen.build_decision_cards(styles, spec))

    for section in spec.sections:
        block = [gen.p(section.title, styles["h1"])]
        for item in section.body:
            block.append(gen.p(item, styles["body"]))
        if section.bullets:
            block.extend([
                gen.build_executive_numbered_list(styles, section.bullets, gen.executive_list_accent(section.title)),
                Spacer(1, 0.34 * gen.cm),
            ])
        if section.table:
            header = [gen.p(cell, styles["table_header"]) for cell in section.table[0]]
            rows = [header]
            for row in section.table[1:]:
                rows.append([gen.p(cell, styles["small"]) for cell in row])
            table = Table(rows, colWidths=gen.proportional_col_widths(section.table), hAlign="LEFT", repeatRows=1)
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), gen.NAVY),
                ("TEXTCOLOR", (0, 0), (-1, 0), gen.BONE),
                ("FONTNAME", (0, 0), (-1, 0), "AtenzaNorticaBold"),
                ("LINEBELOW", (0, 0), (-1, 0), 1.1, gen.AQUA),
                ("BACKGROUND", (0, 1), (-1, -1), gen.colors.white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [gen.colors.white, gen.LIGHT]),
                ("BOX", (0, 0), (-1, -1), 0.35, gen.BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, gen.BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]))
            block.extend([Spacer(1, 0.22 * gen.cm), table, Spacer(1, 0.40 * gen.cm)])
        if section.note:
            note_table = Table([[gen.p(section.note, styles["note"])]], colWidths=[gen.CONTENT_WIDTH], hAlign="LEFT")
            note_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), gen.BONE),
                ("BOX", (0, 0), (-1, -1), 0.45, gen.BORDER),
                ("LINEABOVE", (0, 0), (-1, 0), 1.2, gen.AQUA),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]))
            block.append(note_table)

        if len(block) > 1:
            lead_count = 3 if section.table and len(section.table) <= 6 and len(block) > 2 else 2
            story.append(KeepTogether(block[:lead_count]))
            story.extend(block[lead_count:])
        else:
            story.extend(block)

    story.append(PageBreak())
    story.append(gen.p("Histórico de versões", styles["h1"]))
    history_table = Table(
        [
            [
                gen.p("Versão", styles["table_header"]),
                gen.p("Data", styles["table_header"]),
                gen.p("Responsável", styles["table_header"]),
                gen.p("Descrição", styles["table_header"]),
            ],
            *[
                [gen.p(value, styles["small"]) for value in row]
                for row in VERSION_HISTORY
            ],
        ],
        colWidths=gen.proportional_col_widths([["Versão", "Data", "Responsável", "Descrição"]]),
        hAlign="LEFT",
        repeatRows=1,
    )
    history_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), gen.NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), gen.BONE),
        ("FONTNAME", (0, 0), (-1, 0), "AtenzaNorticaBold"),
        ("LINEBELOW", (0, 0), (-1, 0), 1.1, gen.AQUA),
        ("BOX", (0, 0), (-1, -1), 0.35, gen.BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, gen.BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(history_table)

    doc.build(
        story,
        onFirstPage=lambda canvas, document: gen.draw_page(canvas, document, watermark, spec.title),
        onLaterPages=lambda canvas, document: gen.draw_page(canvas, document, watermark, spec.title),
    )
    return OUTPUT_PDF


def main() -> None:
    OUTPUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    gen = load_generator_module()
    pdf_path = build_pdf(gen)
    print(pdf_path)


if __name__ == "__main__":
    main()
