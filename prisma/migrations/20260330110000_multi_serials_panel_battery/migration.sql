ALTER TABLE "Project"
ADD COLUMN "equipmentPanelSerials" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
ADD COLUMN "equipmentBatterySerials" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL;
