import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface TradeFiltersProps {
  onFiltersChange: (filters: TradeFilters) => void;
  symbolOptions: string[];
}

export interface TradeFilters {
  searchTerm: string;
  tradeType: string;
  status: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const initialFilters: TradeFilters = {
  searchTerm: '',
  tradeType: '',
  status: '',
  sortBy: 'entry_date',
  sortDirection: 'desc'
};

export function TradeFilters({ onFiltersChange }: TradeFiltersProps) {
  const [filters, setFilters] = useState<TradeFilters>(initialFilters);

  const updateFilters = (newFilters: Partial<TradeFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFiltersChange(updated);
  };

  return (
    <div className="w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search trades by symbol, type, or status..."
          value={filters.searchTerm}
          onChange={(e) => updateFilters({ searchTerm: e.target.value })}
          className="pl-10 w-full"
        />
      </div>
    </div>
  );
}