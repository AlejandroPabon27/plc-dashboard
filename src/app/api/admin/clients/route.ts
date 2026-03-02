// =============================================================================
// src/app/api/admin/clients/route.ts — GET + POST clientes (admin)
// Consulta tabla: clients (DB QNAP)
//
// PROPÓSITO: Endpoints de administración para listar y crear clientes OPC-UA.
//
// CONSUMIDO POR: ClientsTab en src/app/admin/page.tsx
//
// ENDPOINTS:
// - GET  /api/admin/clients → lista todos los clientes ordenados por nombre
// - POST /api/admin/clients → crea un nuevo cliente
//   Body: { name: string, server_url: string, server_ip: string }
//   Respuesta: el cliente creado con su id asignado (status 201)
//
// PARA MODIFICAR:
// - Agregar campos al cliente → editar el INSERT y el tipo Cliente
// - Agregar validaciones → extender la verificación antes del INSERT
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { MOCK_CLIENTS } from '@/data/mockData';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

/**
 * GET /api/admin/clients — Lista todos los clientes para la pantalla de administración.
 * Retorna todos los campos de la tabla clients (SELECT *).
 *
 * @returns Array de Cliente[] ordenados por nombre
 */
export async function GET() {
    if (USE_MOCK) return NextResponse.json(MOCK_CLIENTS);
    try {
        const { rows } = await query('SELECT * FROM clients ORDER BY name', [], 10000, 'admin-clients-list');
        return NextResponse.json(rows);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * POST /api/admin/clients — Crea un nuevo cliente OPC-UA.
 * Valida que name, server_url y server_ip estén presentes.
 * Recorta espacios en blanco (trim) de cada campo.
 *
 * @param req - Request con body JSON { name, server_url, server_ip }
 * @returns El cliente creado con id asignado (status 201)
 */
export async function POST(req: NextRequest) {
    if (USE_MOCK) return NextResponse.json({ message: 'Mock: cliente creado' }, { status: 201 });
    try {
        const { name, server_url, server_ip } = await req.json();
        if (!name || !server_url || !server_ip) return NextResponse.json({ error: 'name, server_url y server_ip son requeridos' }, { status: 400 });

        const { rows } = await query(
            'INSERT INTO clients (name, server_url, server_ip) VALUES ($1, $2, $3) RETURNING *',
            [name.trim(), server_url.trim(), server_ip.trim()], 10000, 'admin-client-insert'
        );
        return NextResponse.json(rows[0], { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
