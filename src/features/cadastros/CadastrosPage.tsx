import { NavLink, Navigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/app/PageHeader";
import { DirectoryManagement } from "@/components/Dashboard/DirectoryManagement";
import { CategoryManagement } from "@/components/Dashboard/CategoryManagement";
import { cn } from "@/lib/utils";

const directories = [
  { label: "Funcionários", path: "/cadastros/funcionarios", kind: "employees" as const },
  { label: "Profissionais", path: "/cadastros/profissionais", kind: "professionals" as const },
  { label: "Categorias", path: "/cadastros/categorias", kind: "categories" as const },
];

export default function CadastrosPage() {
  const { directoryKind } = useParams();
  const activeDirectory = directories.find(({ path }) => path.endsWith(directoryKind || ""));

  if (!activeDirectory) return <Navigate to="/cadastros/funcionarios" replace />;

  return (
    <section className="space-y-5">
      <PageHeader
        title="Cadastros"
        description="Mantenha pessoas e categorias compartilhadas para padronizar os cadastros e filtros do sistema."
      />
      <nav aria-label="Tipos de cadastro" className="flex flex-wrap gap-2 border-b border-border pb-3">
        {directories.map(({ label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      {activeDirectory.kind === "categories" ? <CategoryManagement /> : <DirectoryManagement kind={activeDirectory.kind} />}
    </section>
  );
}
