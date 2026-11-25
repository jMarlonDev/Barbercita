CREATE TYPE "public"."payment_status" AS ENUM('pending', 'approved', 'declined', 'voided', 'error');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"reference" varchar(64) NOT NULL,
	"amount_in_cents" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'COP' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"wompi_transaction_id" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payments_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_appointment_id_idx" ON "payments" USING btree ("appointment_id");