import Dexie, { type EntityTable } from 'dexie';

export interface ProjectAsset {
  id: string; // "current"
  draftImage: string | null; // Can be base64 data URL
  vectorSVG: string | null;  // SVG text
}

const db = new Dexie('AlManhajDB') as Dexie & {
  assets: EntityTable<
    ProjectAsset,
    'id' // primary key "id"
  >;
};

db.version(1).stores({
  assets: 'id' // Primary key
});

export const loadAsset = async (id: string = "current") => {
  return await db.assets.get(id);
};

export const saveAsset = async (data: Partial<ProjectAsset>, id: string = "current") => {
  const existing = await db.assets.get(id);
  if (existing) {
    await db.assets.update(id, data);
  } else {
    await db.assets.add({ id, draftImage: null, vectorSVG: null, ...data });
  }
};

export { db };
