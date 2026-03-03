CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" text DEFAULT '2025-10-13T18:06:11.800Z' NOT NULL,
	"unread_by_users" jsonb NOT NULL,
	"sender_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"property_type" text NOT NULL,
	"sign_phone_number" text,
	"location" jsonb NOT NULL,
	"property_id" text NOT NULL,
	"images" jsonb NOT NULL,
	"kml_data" text,
	"marker_color" text NOT NULL,
	"created_at" text DEFAULT '2025-10-13T18:06:11.801Z' NOT NULL,
	CONSTRAINT "properties_property_id_unique" UNIQUE("property_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text,
	"mobile" text,
	"nickname" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_super_admin" boolean DEFAULT false NOT NULL,
	"remember_token" text,
	"last_login_at" text,
	"biometric_credential_id" text,
	"biometric_public_key" text,
	"biometric_counter" integer DEFAULT 0,
	"biometric_enabled" boolean DEFAULT false,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;