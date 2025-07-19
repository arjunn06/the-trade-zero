import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Filter, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TradeFiltersProps {
  onFiltersChange: (filters: TradeFilters) => void;
  symbolOptions: string[];
}

export interface TradeFilters {
  symbol: string;
  tradeType: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  minPnl: string;
  maxPnl: string;
  minQuantity: string;
  maxQuantity: string;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

const initialFilters: TradeFilters = {
  symbol: '',
  tradeType: '',
  status: '',
  dateFrom: '',
  dateTo: '',
  minPnl: '',
  maxPnl: '',
  minQuantity: '',
  maxQuantity: '',
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
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Sorting
                {hasActiveFilters && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFilters();
                    }}
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Search and Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="symbol-filter">Symbol</Label>
                <Select value={filters.symbol} onValueChange={(value) => updateFilters({ symbol: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All symbols" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All symbols</SelectItem>
                    {symbolOptions.map((symbol) => (
                      <SelectItem key={symbol} value={symbol}>
                        {symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="trade-type-filter">Trade Type</Label>
                <Select value={filters.tradeType} onValueChange={(value) => updateFilters({ tradeType: value })}>
                  <SelectTrigger>
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
                <Label htmlFor="status-filter">Status</Label>
                <Select value={filters.status} onValueChange={(value) => updateFilters({ status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date-from">From Date</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilters({ dateFrom: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="date-to">To Date</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilters({ dateTo: e.target.value })}
                />
              </div>
            </div>

            {/* P&L Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-pnl">Min P&L</Label>
                <Input
                  id="min-pnl"
                  type="number"
                  step="0.01"
                  placeholder="Minimum P&L"
                  value={filters.minPnl}
                  onChange={(e) => updateFilters({ minPnl: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="max-pnl">Max P&L</Label>
                <Input
                  id="max-pnl"
                  type="number"
                  step="0.01"
                  placeholder="Maximum P&L"
                  value={filters.maxPnl}
                  onChange={(e) => updateFilters({ maxPnl: e.target.value })}
                />
              </div>
            </div>

            {/* Position Size Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-quantity">Min Position Size</Label>
                <Input
                  id="min-quantity"
                  type="number"
                  step="0.01"
                  placeholder="Minimum quantity"
                  value={filters.minQuantity}
                  onChange={(e) => updateFilters({ minQuantity: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="max-quantity">Max Position Size</Label>
                <Input
                  id="max-quantity"
                  type="number"
                  step="0.01"
                  placeholder="Maximum quantity"
                  value={filters.maxQuantity}
                  onChange={(e) => updateFilters({ maxQuantity: e.target.value })}
                />
              </div>
            </div>

            {/* Sorting */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sort-by">Sort By</Label>
                <Select value={filters.sortBy} onValueChange={(value) => updateFilters({ sortBy: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry_date">Entry Date</SelectItem>
                    <SelectItem value="exit_date">Exit Date</SelectItem>
                    <SelectItem value="pnl">P&L</SelectItem>
                    <SelectItem value="quantity">Position Size</SelectItem>
                    <SelectItem value="symbol">Symbol</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sort-direction">Sort Direction</Label>
                <Select 
                  value={filters.sortDirection} 
                  onValueChange={(value: 'asc' | 'desc') => updateFilters({ sortDirection: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Highest First</SelectItem>
                    <SelectItem value="asc">Lowest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}