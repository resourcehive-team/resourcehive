# ResourceHive architecture diagrams — version 2

These PlantUML sources correspond one-to-one with the numbered figure placeholders in `design-doc.docx`. Render them at high resolution with a white background and insert the resulting images inline at their matching placeholders. The sources intentionally describe the complete target system in the SRS, including features that are not yet implemented.

Recommended rendering command when PlantUML is installed:

```text
plantuml -tsvg design-diagrams-2-plantuml/*.puml
```

SVG is preferred for Word/Google Docs because it remains sharp when scaled. If PNG is required, render at a high DPI and keep labels at approximately 12 pt or larger.


Version 2 applies the architecture-diagrams skill's relevant layout guidance: white backgrounds, enlarged fonts, generous node/rank spacing, explicit clusters, and labeled relationships. Azure-specific icons and cloud assumptions are intentionally excluded because they are not part of the ResourceHive SRS.

