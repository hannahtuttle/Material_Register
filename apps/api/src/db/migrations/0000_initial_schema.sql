CREATE TYPE "public"."material_status" AS ENUM('Active', 'Obsolete', 'Pending Review');--> statement-breakpoint
CREATE TYPE "public"."material_type" AS ENUM('Spare Part', 'Consumable', 'Raw Material', 'Tool');--> statement-breakpoint
CREATE TABLE "manufacturers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "manufacturers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"material_number" text NOT NULL,
	"description" text NOT NULL,
	"material_type" "material_type" NOT NULL,
	"status" "material_status" NOT NULL,
	"manufacturer_id" integer NOT NULL,
	"manufacturer_part_number" text NOT NULL,
	"plant_id" integer NOT NULL,
	"unit_of_measure" text NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"quantity_on_hand" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "materials_material_number_unique" UNIQUE("material_number")
);
--> statement-breakpoint
CREATE TABLE "plants" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "plants_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_manufacturer_id_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_plant_id_plants_id_fk" FOREIGN KEY ("plant_id") REFERENCES "public"."plants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "materials_status_idx" ON "materials" USING btree ("status");--> statement-breakpoint
CREATE INDEX "materials_material_type_idx" ON "materials" USING btree ("material_type");--> statement-breakpoint
CREATE INDEX "materials_plant_id_idx" ON "materials" USING btree ("plant_id");--> statement-breakpoint
CREATE INDEX "materials_manufacturer_id_idx" ON "materials" USING btree ("manufacturer_id");--> statement-breakpoint
CREATE INDEX "materials_unit_price_idx" ON "materials" USING btree ("unit_price");--> statement-breakpoint
CREATE INDEX "materials_updated_at_idx" ON "materials" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "materials_description_idx" ON "materials" USING btree ("description");--> statement-breakpoint
CREATE INDEX "materials_quantity_on_hand_idx" ON "materials" USING btree ("quantity_on_hand");