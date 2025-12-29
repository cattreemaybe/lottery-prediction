-- CreateTable
CREATE TABLE "lottery_draws" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "draw_date" TIMESTAMP(3) NOT NULL,
    "red_balls" INTEGER[],
    "blue_ball" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lottery_draws_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "red_balls" INTEGER[],
    "blue_ball" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "algorithm" TEXT NOT NULL,
    "dataset_size" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result_period" TEXT,
    "is_correct" BOOLEAN,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "algorithm_performance" (
    "id" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL,
    "total_runs" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "partial_matches" INTEGER NOT NULL DEFAULT 0,
    "avg_confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "algorithm_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_logs" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "record_count" INTEGER NOT NULL,
    "skip_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error_msg" TEXT,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lottery_draws_period_key" ON "lottery_draws"("period");

-- CreateIndex
CREATE INDEX "lottery_draws_draw_date_idx" ON "lottery_draws"("draw_date");

-- CreateIndex
CREATE INDEX "lottery_draws_period_idx" ON "lottery_draws"("period");

-- CreateIndex
CREATE INDEX "predictions_generated_at_idx" ON "predictions"("generated_at");

-- CreateIndex
CREATE INDEX "predictions_algorithm_idx" ON "predictions"("algorithm");

-- CreateIndex
CREATE UNIQUE INDEX "algorithm_performance_algorithm_key" ON "algorithm_performance"("algorithm");

-- CreateIndex
CREATE INDEX "import_logs_imported_at_idx" ON "import_logs"("imported_at");
