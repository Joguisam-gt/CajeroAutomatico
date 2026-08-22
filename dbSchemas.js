/**
 * Esquemas de validación $jsonSchema para las colecciones de MongoDB.
 * Aplica reglas de tipos, campos obligatorios y patrones de identificadores únicos.
 */

export const dbSchemas = {
    CrearCuenta: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['numeroCuenta', 'documento', 'nombre', 'clave', 'saldo', 'fechaCreacion'],
            additionalProperties: false,
            properties: {
                _id: { bsonType: 'objectId' },
                numeroCuenta: { 
                    bsonType: 'int', 
                    description: 'Número de cuenta secuencial (obligatorio y de tipo entero)' 
                },
                documento: { 
                    bsonType: 'string', 
                    pattern: '^[a-zA-Z0-9]+$', 
                    description: 'Documento de identidad alfanumérico sin caracteres especiales' 
                },
                nombre: { 
                    bsonType: 'string', 
                    minLength: 1, 
                    description: 'Nombre completo del titular' 
                },
                clave: { 
                    bsonType: 'string', 
                    minLength: 1, 
                    description: 'Clave de acceso de la cuenta' 
                },
                saldo: { 
                    bsonType: ['double', 'int', 'decimal'], 
                    minimum: 0, 
                    description: 'Saldo disponible no negativo' 
                },
                fechaCreacion: { 
                    bsonType: 'string', 
                    description: 'Fecha en formato legible' 
                }
            }
        }
    },

    Deposit: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['id', 'numeroCuenta', 'monto', 'tipo', 'fecha', 'saldoResultante'],
            additionalProperties: false,
            properties: {
                _id: { bsonType: 'objectId' },
                id: { 
                    bsonType: 'string', 
                    pattern: '^D-\\d{3,}$', 
                    description: 'Identificador único con formato D-001, D-002, etc.' 
                },
                numeroCuenta: { 
                    bsonType: 'int', 
                    description: 'Número de cuenta receptora' 
                },
                monto: { 
                    bsonType: ['double', 'int', 'decimal'], 
                    minimum: 0.01, 
                    description: 'Monto consignado superior a 0' 
                },
                tipo: { 
                    bsonType: 'string', 
                    enum: ['Consignacion'], 
                    description: 'Tipo de transacción' 
                },
                fecha: { 
                    bsonType: 'string' 
                },
                saldoResultante: { 
                    bsonType: ['double', 'int', 'decimal'] 
                }
            }
        }
    },

    Withdraw: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['id', 'numeroCuenta', 'monto', 'tipo', 'fecha', 'saldoResultante'],
            additionalProperties: false,
            properties: {
                _id: { bsonType: 'objectId' },
                id: { 
                    bsonType: 'string', 
                    pattern: '^W-\\d{3,}$', 
                    description: 'Identificador único con formato W-001, W-002, etc.' 
                },
                numeroCuenta: { 
                    bsonType: 'int', 
                    description: 'Número de cuenta de origen' 
                },
                monto: { 
                    bsonType: ['double', 'int', 'decimal'], 
                    minimum: 0.01, 
                    description: 'Monto a retirar superior a 0' 
                },
                tipo: { 
                    bsonType: 'string', 
                    enum: ['Retiro'], 
                    description: 'Tipo de transacción' 
                },
                fecha: { 
                    bsonType: 'string' 
                },
                saldoResultante: { 
                    bsonType: ['double', 'int', 'decimal'] 
                }
            }
        }
    },

    Services: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['id', 'numeroCuenta', 'monto', 'tipo', 'servicio', 'referencia', 'fecha', 'saldoResultante'],
            additionalProperties: false,
            properties: {
                _id: { bsonType: 'objectId' },
                id: { 
                    bsonType: 'string', 
                    minLength: 1, 
                    description: 'ID de transacción igual a la referencia ingresada' 
                },
                numeroCuenta: { 
                    bsonType: 'int' 
                },
                monto: { 
                    bsonType: ['double', 'int', 'decimal'], 
                    minimum: 0.01 
                },
                tipo: { 
                    bsonType: 'string' 
                },
                servicio: { 
                    bsonType: 'string', 
                    enum: ['Energía', 'Agua', 'Gas'], 
                    description: 'Servicio público pagado' 
                },
                referencia: { 
                    bsonType: 'string', 
                    minLength: 1 
                },
                fecha: { 
                    bsonType: 'string' 
                },
                saldoResultante: { 
                    bsonType: ['double', 'int', 'decimal'] 
                }
            }
        }
    },

    History: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['id', 'numeroCuenta', 'monto', 'tipo', 'fecha', 'saldoResultante'],
            additionalProperties: true, // Permite atributos extra como 'servicio' o 'referencia' provenientes de Services
            properties: {
                _id: { bsonType: 'objectId' },
                id: { 
                    bsonType: 'string', 
                    description: 'Conserva el ID original de la colección de origen (D-xxx, W-xxx o Ref)' 
                },
                numeroCuenta: { 
                    bsonType: 'int' 
                },
                monto: { 
                    bsonType: ['double', 'int', 'decimal'] 
                },
                tipo: { 
                    bsonType: 'string' 
                },
                fecha: { 
                    bsonType: 'string' 
                },
                saldoResultante: { 
                    bsonType: ['double', 'int', 'decimal'] 
                },
                servicio: { 
                    bsonType: 'string' 
                },
                referencia: { 
                    bsonType: 'string' 
                }
            }
        }
    }
};