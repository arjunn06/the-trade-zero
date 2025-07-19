import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Filter, X, Search } from 'lucide-react';

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

export function TradeFilters({ onFiltersChange, symbolOptions }: TradeFiltersProps) {
  const [filters, setFilters] = useState<TradeFilters>(initialFilters);
  const [isOpen, setIsOpen] = useState(false);

  const updateFilters = (newFilters: Partial<TradeFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFiltersChange(updated);
    console.log('Filters updated:', updated); // Debug log
  };

  const clearFilters = () => {
    setFilters(initialFilters);
    onFiltersChange(initialFilters);
  };

  const hasActiveFilters = Object.values(filters).some((value, index) => {
    const keys = Object.keys(initialFilters);
    return value !== initialFilters[keys[index] as keyof TradeFilters];
  });

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      {/* Search Input */}
      <div className="relative flex-1 max-w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search trades by symbol..."
          value={filters.searchTerm}
          onChange={(e) => updateFilters({ searchTerm: e.target.value })}
          className="pl-10 w-full"
        />
      </div>

      {/* Filter Popup */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="relative w-full sm:w-auto shrink-0"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 max-w-[calc(100vw-2rem)] bg-background border shadow-lg z-50" 
          align="end"
          sideOffset={4}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filter Trades</h4>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto p-1 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            <Separator />

            {/* Quick Filters */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground">TRADE TYPE</Label>
                <Select value={filters.tradeType} onValueChange={(value) => updateFilters({ tradeType: value })}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All types</SelectItem>
                    <SelectItem value="long">Long</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-muted-foreground">STATUS</Label>
                <Select value={filters.status} onValueChange={(value) => updateFilters({ status: value })}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Sorting */}
              <div>
                <Label className="text-xs font-medium text-muted-foreground">SORT BY</Label>
                <div className="flex gap-2">
                  <Select value={filters.sortBy} onValueChange={(value) => updateFilters({ sortBy: value })}>
                    <SelectTrigger className="h-8 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry_date">Date</SelectItem>
                      <SelectItem value="pnl">P&L</SelectItem>
                      <SelectItem value="quantity">Size</SelectItem>
                      <SelectItem value="symbol">Symbol</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select 
                    value={filters.sortDirection} 
                    onValueChange={(value: 'asc' | 'desc') => updateFilters({ sortDirection: value })}
                  >
                    <SelectTrigger className="h-8 w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">↓</SelectItem>
                      <SelectItem value="asc">↑</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}