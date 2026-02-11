import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TEMPLATES, Template } from "@/lib/templates";
import { loadCustomTemplates } from "@/lib/templateStorage";

interface TemplatePanelProps {
  activeTemplate: string;
  onSelectTemplate: (template: Template) => void;
}

const TemplatePanel = ({ activeTemplate, onSelectTemplate }: TemplatePanelProps) => {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    const custom = loadCustomTemplates();
    setTemplates([...TEMPLATES, ...custom]);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2">
      {templates.map((template) => {
        const isActive = activeTemplate === template.id;

        return (
          <motion.button
            key={template.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelectTemplate(template)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all text-left ${
              isActive
                ? "ring-2 ring-primary bg-primary/10"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <div
              className="w-full aspect-[2/3] rounded-md flex items-center justify-center text-xl overflow-hidden"
              style={{
                backgroundColor: template.bgColor,
                backgroundImage: template.bgImage ? `url(${template.bgImage})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                border: template.borderStyle || "2px solid hsl(350 20% 85%)",
              }}
            >
              {!template.bgImage && template.emoji}
            </div>
            <span className="text-[10px] font-body font-semibold text-foreground truncate w-full text-center">
              {template.name}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default TemplatePanel;
