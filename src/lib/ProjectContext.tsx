import { createContext, useContext, useState, ReactNode } from "react";

interface ProjectData {
  brand: string;
  konsep: string;
  warnaMax: string;
  moodboards: string[];
}

interface ProjectContextType {
  projectData: ProjectData;
  updateProjectData: (data: Partial<ProjectData>) => void;
}

const defaultProjectData: ProjectData = {
  brand: "Urbex Syndicate",
  konsep: "Desain flat vector 2D yang mengusung gaya Retro Screen-Print",
  warnaMax: "4",
  moodboards: [],
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectData, setProjectData] = useState<ProjectData>(defaultProjectData);

  const updateProjectData = (data: Partial<ProjectData>) => {
    setProjectData((prev) => ({ ...prev, ...data }));
  };

  return (
    <ProjectContext.Provider value={{ projectData, updateProjectData }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
