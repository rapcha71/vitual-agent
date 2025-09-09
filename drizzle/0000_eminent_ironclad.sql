CREATE TABLE "deleted_properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"original_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"operation_type" text NOT NULL,
	"property_type" text NOT NULL,
	"sign_phone_number" text,
	"location" jsonb NOT NULL,
	"property_id" text NOT NULL,
	"images" jsonb NOT NULL,
	"kml_data" text,
	"marker_color" text NOT NULL,
	"created_at" text NOT NULL,
	"deleted_at" text DEFAULT '2025-09-08T23:32:50.334Z' NOT NULL,
	"deleted_by" integer NOT NULL,
	"delete_reason" text
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" text DEFAULT '2025-09-08T23:32:50.333Z' NOT NULL,
	"unread_by_users" jsonb NOT NULL,
	"sender_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"operation_type" text NOT NULL,
	"property_type" text NOT NULL,
	"sign_phone_number" text,
	"location" jsonb NOT NULL,
	"property_id" text NOT NULL,
	"images" jsonb NOT NULL,
	"kml_data" text,
	"marker_color" text NOT NULL,
	"created_at" text DEFAULT '2025-09-08T23:32:50.334Z' NOT NULL,
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
ALTER TABLE "deleted_properties" ADD CONSTRAINT "deleted_properties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deleted_properties" ADD CONSTRAINT "deleted_properties_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;