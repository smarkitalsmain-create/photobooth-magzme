import { motion } from "framer-motion";
import { FILTERS } from "@/lib/stickers";

interface FilterPanelProps {
  activeFilter: string;
  onSelectFilter: (filterId: string) => void;
  previewImage?: string | null;
}

const FilterPanel = ({ activeFilter, onSelectFilter, previewImage }: FilterPanelProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {FILTERS.map((filter) => (
        <motion.button
          key={filter.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelectFilter(filter.id)}
          className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
            activeFilter === filter.id
              ? "bg-primary/20 ring-2 ring-primary"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          <div
            className="w-12 h-12 rounded-lg overflow-hidden bg-card booth-border"
            style={{ filter: filter.css || undefined }}
          >
            {previewImage ? (
              <img src={previewImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/40 to-coral/40" />
            )}
          </div>
          <span className="text-[10px] font-body font-semibold text-foreground">{filter.name}</span>
        </motion.button>
      ))}
    </div>
  );
};

export default FilterPanel;
