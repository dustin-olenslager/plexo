CREATE TABLE "models_knowledge" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"context_window" integer DEFAULT 128000 NOT NULL,
	"cost_per_m_in" real NOT NULL,
	"cost_per_m_out" real NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reliability_score" real DEFAULT 1 NOT NULL,
	"last_synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "models_knowledge_provider_idx" ON "models_knowledge" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "models_knowledge_model_idx" ON "models_knowledge" USING btree ("model_id");