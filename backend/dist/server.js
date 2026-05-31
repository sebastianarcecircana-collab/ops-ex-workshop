"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const loadEnv_1 = require("./config/loadEnv");
const migrate_1 = require("./db/migrate");
const missionSpec_1 = require("./services/missionSpec");
const minio_1 = require("./services/minio");
const cohorts_1 = __importDefault(require("./routes/cohorts"));
const teams_1 = __importDefault(require("./routes/teams"));
const gates_1 = __importDefault(require("./routes/gates"));
const scenario_1 = __importDefault(require("./routes/scenario"));
const assets_1 = __importDefault(require("./routes/assets"));
const admin_1 = __importDefault(require("./routes/admin"));
const app = (0, express_1.default)();
(0, loadEnv_1.loadEnv)();
const PORT = parseInt(process.env.PORT || '3001', 10);
// Security + parsing middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json({ limit: '512kb' }));
// Routes
app.use('/api/cohorts', cohorts_1.default);
app.use('/api/teams', teams_1.default);
app.use('/api/gates', gates_1.default);
app.use('/api/scenario', scenario_1.default);
app.use('/api/assets', assets_1.default);
app.use('/api/admin', admin_1.default);
// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
// 404 catch-all
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
// Global error handler
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});
async function start() {
    // Ensure schema exists for fresh environments before serving requests.
    await (0, migrate_1.applyMigrations)();
    // Load mission spec eagerly (fails fast if YAML is missing/invalid)
    (0, missionSpec_1.loadMissionSpec)();
    // Ensure MinIO bucket exists and Gate 3 CSV is uploaded
    try {
        await (0, minio_1.ensureBucketAndSeedFiles)();
    }
    catch (err) {
        console.warn('MinIO setup failed (non-fatal in dev):', err.message);
    }
    app.listen(PORT, () => {
        console.log(`API server running on port ${PORT}`);
    });
}
start().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map