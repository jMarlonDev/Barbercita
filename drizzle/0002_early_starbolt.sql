ALTER TYPE "public"."appointment_status" ADD VALUE 'no_show';--> statement-breakpoint
CREATE TABLE "appointment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"actor_id" uuid,
	"actor_role" varchar(20) NOT NULL,
	"action" varchar(30) NOT NULL,
	"detail" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "barber_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"barber_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"business_name" varchar(100) DEFAULT 'BarberCita' NOT NULL,
	"business_hours" jsonb,
	"max_barbers" integer DEFAULT 10 NOT NULL,
	"commission_percent" numeric(5, 2) DEFAULT '30' NOT NULL,
	"chair_rent_cents" integer DEFAULT 0 NOT NULL,
	"rules_notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "barbers" ADD COLUMN "payment_method" varchar(100);--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "owner_barber_id" uuid;--> statement-breakpoint
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barber_payouts" ADD CONSTRAINT "barber_payouts_barber_id_barbers_id_fk" FOREIGN KEY ("barber_id") REFERENCES "public"."barbers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "appointment_events_appt_idx" ON "appointment_events" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "barber_payouts_barber_idx" ON "barber_payouts" USING btree ("barber_id");