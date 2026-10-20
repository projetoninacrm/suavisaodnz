import { FilterField } from "@/components/data/FilterField";
import { FilterGrid } from "@/components/data/FilterGrid";
import { SearchInput } from "@/components/data/SearchInput";
import { SelectFilter } from "@/components/data/SelectFilter";
import type { CatalogFilterStatus } from "@/hooks/useCatalogFilterState";

export type { CatalogFilterStatus } from "@/hooks/useCatalogFilterState";

interface CatalogFiltersProps {
  idPrefix: string;
  query: string;
  onQueryChange: (value: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  status: CatalogFilterStatus;
  onStatusChange: (value: CatalogFilterStatus) => void;
  statusLabel: string;
  statusOptions: { all: string; active: string; inactive: string };
}

export function CatalogFilters({
  idPrefix,
  query,
  onQueryChange,
  searchLabel,
  searchPlaceholder,
  status,
  onStatusChange,
  statusLabel,
  statusOptions,
}: CatalogFiltersProps) {
  const handleStatusChange = (value: string) => {
    if (value === "all" || value === "active" || value === "inactive") {
      onStatusChange(value);
    }
  };

  return (
    <FilterGrid columns={2} className="sm:grid-cols-[minmax(0,1fr)_220px]">
      <FilterField id={`${idPrefix}-search`} label={searchLabel}>
        <SearchInput
          id={`${idPrefix}-search`}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={searchPlaceholder}
        />
      </FilterField>
      <SelectFilter
        id={`${idPrefix}-status`}
        label={statusLabel}
        value={status}
        onValueChange={handleStatusChange}
        options={[
          { value: "all", label: statusOptions.all },
          { value: "active", label: statusOptions.active },
          { value: "inactive", label: statusOptions.inactive },
        ]}
      />
    </FilterGrid>
  );
}
