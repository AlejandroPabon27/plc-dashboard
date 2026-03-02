-- =============================================================================
-- migrations/001_high_volume_indexes.sql
-- Índices recomendados para soportar 1-5 millones de filas por hora en la tabla logs
-- Ejecutar en la DB QNAP: psql -h <QNAP_IP> -U postgres -d labdb -f migrations/001_high_volume_indexes.sql
-- =============================================================================

-- Índice principal: cubre las queries de listado paginado y stats por hora
-- Si ya existe idx_logs_node_time, este lo complementa con un índice puro de timestamp
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_opc_timestamp
    ON logs (opc_timestamp DESC);

-- Índice para COUNT y GROUP BY quality acotados a un rango de tiempo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_timestamp_quality
    ON logs (opc_timestamp DESC, quality);

-- Índice para filtrado por node_id_fk + rango de tiempo (ya existe como idx_logs_node_time)
-- Verificar que existe:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_node_time
--     ON logs (node_id_fk, opc_timestamp DESC);

-- Índice para queries recientes: LIMIT 5 ORDER BY opc_timestamp DESC
-- es cubierto por idx_logs_opc_timestamp

-- Índice en node_ids para JOINs rápidos por client_id y tag_group
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_node_ids_client_id
    ON node_ids (client_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_node_ids_tag_group
    ON node_ids (tag_group);

-- ── Particionamiento (RECOMENDADO para tablas > 100M filas) ──
-- Si la tabla crece a cientos de millones de filas, considerar convertirla
-- a tabla particionada por rango de opc_timestamp (por día o semana).
-- Esto permite que PostgreSQL elimine particiones completas del escaneo.
-- Ejemplo:
--
-- CREATE TABLE logs_partitioned (LIKE logs INCLUDING ALL)
--     PARTITION BY RANGE (opc_timestamp);
--
-- CREATE TABLE logs_y2026_w09 PARTITION OF logs_partitioned
--     FOR VALUES FROM ('2026-02-24') TO ('2026-03-03');
--
-- NOTA: Esto requiere detener la ingesta, migrar datos, y actualizar el
--       servicio que inserta. Implementar solo cuando la tabla supere 100M filas.

-- ── Autovacuum más frecuente (evitar bloat en tabla de alta inserción) ──
ALTER TABLE logs SET (
    autovacuum_vacuum_scale_factor = 0.01,      -- Vacuum al 1% de cambios (vs 20% default)
    autovacuum_analyze_scale_factor = 0.005,     -- Analyze al 0.5%
    autovacuum_vacuum_cost_delay = 2             -- Vacuum más rápido (menos delay)
);
