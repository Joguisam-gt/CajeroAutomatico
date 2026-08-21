import readline from 'readline';
import { MongoClient } from 'mongodb';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const preguntar = (mensaje) => new Promise((resolve) => rl.question(mensaje, resolve));

// ==========================================
// 1. PATRÓN SINGLETON - CONEXIÓN A MONGO DB
// ==========================================
class Database {
    constructor() {
        if (Database.instancia) {
            return Database.instancia;
        }
        this.cliente = null;
        this.db = null;
        this.uri = 'mongodb://localhost:27018/?directConnection=true';
        this.nombreBD = 'acme_bank';
        Database.instancia = this;
    }

    static obtenerInstancia() {
        if (!Database.instancia) {
            Database.instancia = new Database();
        }
        return Database.instancia;
    }

    async conectar() {
        if (this.cliente) {
            return this.db;
        }

        try {
            console.log('\nConectando a MongoDB en localhost:27018...');
            this.cliente = new MongoClient(this.uri);
            await this.cliente.connect();
            this.db = this.cliente.db(this.nombreBD);
            console.log(' Conexión establecida exitosamente con MongoDB');
            return this.db;
        } catch (error) {
            console.log(' Error al conectar con MongoDB:', error.message);
            throw error;
        }
    }

    obtenerColeccion(nombreColeccion) {
        if (!this.db) {
            throw new Error('La base de datos no está conectada.');
        }
        return this.db.collection(nombreColeccion);
    }

    async cerrar() {
        if (this.cliente) {
            await this.cliente.close();
            this.cliente = null;
            this.db = null;
            console.log('Conexión con MongoDB cerrada.');
        }
    }
}

// ==========================================
// 2. MODELOS DE DOMINIO - POO (HERENCIA Y POLIMORFISMO)
// ==========================================

class Transaccion {
    constructor(id, monto, tipo, fecha = new Date().toLocaleString()) {
        this.id = id;
        this.monto = monto;
        this.tipo = tipo;
        this.fecha = fecha;
    }

    obtenerResumen() {
        return `${this.fecha} | ID: ${this.id} | Tipo: ${this.tipo} | Monto: Q${this.monto}`;
    }

    aObjeto() {
        return {
            id: this.id,
            monto: this.monto,
            tipo: this.tipo,
            fecha: this.fecha
        };
    }

    static desdeObjeto(obj) {
        if (obj.tipo === 'Consignacion') {
            return new Consignacion(obj.id, obj.monto, obj.fecha);
        }
        if (obj.tipo === 'Retiro') {
            return new Retiro(obj.id, obj.monto, obj.fecha);
        }
        if (obj.tipo && obj.tipo.startsWith('Pago de')) {
            return new PagoServicio(obj.id, obj.monto, obj.servicio, obj.referencia, obj.fecha);
        }
        return new Transaccion(obj.id, obj.monto, obj.tipo, obj.fecha);
    }
}

class Consignacion extends Transaccion {
    constructor(id, monto, fecha) {
        super(id, monto, 'Consignacion', fecha);
    }

    obtenerResumen() {
        return `${super.obtenerResumen()} | Estado: Exitosa (Abono)`;
    }
}

class Retiro extends Transaccion {
    constructor(id, monto, fecha) {
        super(id, monto, 'Retiro', fecha);
    }

    obtenerResumen() {
        return `${super.obtenerResumen()} | Estado: Exitosa (Débito)`;
    }
}

class PagoServicio extends Transaccion {
    constructor(id, monto, servicio, referencia, fecha) {
        super(id, monto, `Pago de ${servicio}`, fecha);
        this.servicio = servicio;
        this.referencia = referencia;
    }

    obtenerResumen() {
        return `${super.obtenerResumen()} | Ref: ${this.referencia}`;
    }

    aObjeto() {
        return {
            ...super.aObjeto(),
            servicio: this.servicio,
            referencia: this.referencia
        };
    }
}

class Cuenta {
    #clave; // Encapsulamiento privado ES2022

    constructor(numeroCuenta, documento, nombre, clave, saldo = 0) {
        this.numeroCuenta = numeroCuenta;
        this.documento = documento;
        this.nombre = nombre;
        this.#clave = clave;
        this.saldo = saldo;
    }

    get clave() {
        return this.#clave;
    }

    validarClave(claveIngresada) {
        return this.#clave === claveIngresada;
    }

    depositar(monto, idTransaccion) {
        this.saldo += monto;
        return new Consignacion(idTransaccion, monto);
    }

    retirar(monto, idTransaccion) {
        if (monto > this.saldo) return null;
        this.saldo -= monto;
        return new Retiro(idTransaccion, monto);
    }

    pagarServicio(monto, servicio, referencia, idTransaccion) {
        if (monto > this.saldo) return null;
        this.saldo -= monto;
        return new PagoServicio(idTransaccion, monto, servicio, referencia);
    }

    static desdeObjeto(doc) {
        return new Cuenta(
            doc.numeroCuenta,
            doc.documento,
            doc.nombre,
            doc.clave,
            doc.saldo
        );
    }
}

// ==========================================
// 3. CAPA DE PERSISTENCIA POR COLECCIONES (SOLID: SRP)
// ==========================================

class CrearCuentaRepository {
    constructor() {
        this.coleccionNombre = 'CrearCuenta';
    }

    _getColeccion() {
        return Database.obtenerInstancia().obtenerColeccion(this.coleccionNombre);
    }

    async guardarCuenta(cuenta) {
        const col = this._getColeccion();
        await col.insertOne({
            numeroCuenta: cuenta.numeroCuenta,
            documento: cuenta.documento,
            nombre: cuenta.nombre,
            clave: cuenta.clave,
            saldo: cuenta.saldo,
            fechaCreacion: new Date().toLocaleString()
        });
    }

    async buscarPorNumero(numeroCuenta) {
        const col = this._getColeccion();
        const doc = await col.findOne({ numeroCuenta });
        if (!doc) return null;
        return Cuenta.desdeObjeto(doc);
    }

    async actualizarSaldo(numeroCuenta, nuevoSaldo) {
        const col = this._getColeccion();
        await col.updateOne(
            { numeroCuenta },
            { $set: { saldo: nuevoSaldo } }
        );
    }

    async obtenerSiguienteNumeroCuenta() {
        const col = this._getColeccion();
        const ultima = await col.find().sort({ numeroCuenta: -1 }).limit(1).toArray();
        return ultima.length > 0 ? ultima[0].numeroCuenta + 1 : 1001;
    }
}

class DepositRepository {
    async obtenerSiguienteId() {
        const col = Database.obtenerInstancia().obtenerColeccion('Deposit');
        const total = await col.countDocuments();
        const correlativo = (total + 1).toString().padStart(3, '0');
        return `D-${correlativo}`;
    }

    async guardarDeposito(numeroCuenta, transaccion, saldoResultante) {
        const col = Database.obtenerInstancia().obtenerColeccion('Deposit');
        await col.insertOne({
            numeroCuenta,
            ...transaccion.aObjeto(),
            saldoResultante
        });
    }
}

class WithdrawRepository {
    async obtenerSiguienteId() {
        const col = Database.obtenerInstancia().obtenerColeccion('Withdraw');
        const total = await col.countDocuments();
        const correlativo = (total + 1).toString().padStart(3, '0');
        return `W-${correlativo}`;
    }

    async guardarRetiro(numeroCuenta, transaccion, saldoResultante) {
        const col = Database.obtenerInstancia().obtenerColeccion('Withdraw');
        await col.insertOne({
            numeroCuenta,
            ...transaccion.aObjeto(),
            saldoResultante
        });
    }
}

class ServicesRepository {
    async guardarPagoServicio(numeroCuenta, transaccion, saldoResultante) {
        const col = Database.obtenerInstancia().obtenerColeccion('Services');
        await col.insertOne({
            numeroCuenta,
            ...transaccion.aObjeto(),
            saldoResultante
        });
    }
}

class HistoryRepository {
    async registrarEnHistorial(numeroCuenta, transaccion, saldoResultante) {
        const col = Database.obtenerInstancia().obtenerColeccion('History');
        await col.insertOne({
            numeroCuenta,
            ...transaccion.aObjeto(),
            saldoResultante
        });
    }

    async obtenerMovimientos(numeroCuenta) {
        const col = Database.obtenerInstancia().obtenerColeccion('History');
        const docs = await col.find({ numeroCuenta }).toArray();
        return docs.map(doc => ({
            transaccion: Transaccion.desdeObjeto(doc),
            saldoResultante: doc.saldoResultante
        }));
    }
}

// ==========================================
// 4. AUTENTICACIÓN Y MENÚ
// ==========================================

const cuentaRepo = new CrearCuentaRepository();
const depositRepo = new DepositRepository();
const withdrawRepo = new WithdrawRepository();
const servicesRepo = new ServicesRepository();
const historyRepo = new HistoryRepository();

async function autenticar() {
    while (true) {
        const numInput = await preguntar("Ingrese su número de cuenta (o 'cancelar' para volver): ");
        if (numInput.toLowerCase() === 'cancelar') return null;

        const numCuenta = parseInt(numInput);
        if (isNaN(numCuenta)) {
            console.log('\n Por favor ingrese un número de cuenta válido.\n');
            continue;
        }

        const cuentaObj = await cuentaRepo.buscarPorNumero(numCuenta);

        if (!cuentaObj) {
            console.log('\n La cuenta ingresada no existe en la base de datos. Intente de nuevo.\n');
            continue;
        }

        const clave = await preguntar('Ingrese su clave: ');

        if (!cuentaObj.validarClave(clave)) {
            console.log('\n Clave incorrecta. Intente de nuevo.\n');
            continue;
        }

        return cuentaObj;
    }
}

async function menuPrincipal() {
    const dbInstance = Database.obtenerInstancia();
    try {
        await dbInstance.conectar();
    } catch (error) {
        console.log('No se pudo conectar a MongoDB. Finalizando ejecución.');
        rl.close();
        return;
    }

    let salir = false;

    while (!salir) {
        console.log('\n====================================');
        console.log('       BIENVENIDO A ACME BANK       ');
        console.log('====================================');
        console.log('1. Crear cuenta bancaria');
        console.log('2. Consignar dinero');
        console.log('3. Retirar dinero');
        console.log('4. Pagar servicios');
        console.log('5. Mostrar movimientos bancarios');
        console.log('6. Salir');
        console.log('====================================');

        const opcion = await preguntar('Elija una opción (1-6): ');

        switch (opcion.trim()) {
            case '1': {
                console.log('\n--- CREAR CUENTA ---');

                let doc = '';
                const regexAlfanumerico = /^[a-zA-Z0-9]+$/;
                while (true) {
                    doc = (await preguntar('Número de documento: ')).trim();
                    if (!doc || !regexAlfanumerico.test(doc)) {
                        console.log('\n El número de documento solo debe contener letras y números.\n');
                    } else {
                        break;
                    }
                }

                let nombre = '';
                while (!nombre) {
                    nombre = (await preguntar('Nombre del titular: ')).trim();
                    if (!nombre) console.log('\n El nombre es obligatorio.\n');
                }

                let clave = '';
                while (!clave) {
                    clave = (await preguntar('Asigne una clave: ')).trim();
                    if (!clave) console.log('\n La clave es obligatoria.\n');
                }

                const siguienteNumero = await cuentaRepo.obtenerSiguienteNumeroCuenta();
                const nuevaCuenta = new Cuenta(siguienteNumero, doc, nombre, clave);
                
                await cuentaRepo.guardarCuenta(nuevaCuenta);

                console.log('\n Cuenta creada y guardada en la colección "CrearCuenta" exitosamente');
                console.log(`Su número de cuenta asignado es: ${siguienteNumero}`);

                await preguntar('\nPresiona Enter para continuar...');
                break;
            }

            case '2': {
                console.log('\n--- CONSIGNAR DINERO ---');

                let cuentaObj = null;
                while (!cuentaObj) {
                    const inputNum = await preguntar("Ingrese número de cuenta destino (o 'cancelar'): ");
                    if (inputNum.toLowerCase() === 'cancelar') break;

                    const num = parseInt(inputNum);
                    cuentaObj = await cuentaRepo.buscarPorNumero(num);

                    if (!cuentaObj) {
                        console.log('\n La cuenta destino no existe en la base de datos. Intente de nuevo.\n');
                    }
                }

                if (!cuentaObj) break;

                let monto = 0;
                while (isNaN(monto) || monto <= 0) {
                    monto = parseFloat(await preguntar('Monto a consignar: Q'));
                    if (isNaN(monto) || monto <= 0) {
                        console.log('\n El monto debe ser un número mayor a 0.\n');
                    }
                }

                // Generación de ID propio de la colección Deposit (D-001, D-002...)
                const idTx = await depositRepo.obtenerSiguienteId();
                const tx = cuentaObj.depositar(monto, idTx);

                await depositRepo.guardarDeposito(cuentaObj.numeroCuenta, tx, cuentaObj.saldo);
                await historyRepo.registrarEnHistorial(cuentaObj.numeroCuenta, tx, cuentaObj.saldo);
                await cuentaRepo.actualizarSaldo(cuentaObj.numeroCuenta, cuentaObj.saldo);

                console.log('\n RESUMEN DE CONSIGNACIÓN:');
                console.log(tx.obtenerResumen());
                console.log(`Saldo actual de la cuenta: Q${cuentaObj.saldo}`);

                await preguntar('\nPresiona Enter para continuar...');
                break;
            }

            case '3': {
                console.log('\n--- RETIRAR DINERO ---');
                const cuentaObj = await autenticar();
                if (!cuentaObj) break;

                let monto = 0;
                while (isNaN(monto) || monto <= 0) {
                    monto = parseFloat(await preguntar('Monto a retirar: Q'));
                    if (isNaN(monto) || monto <= 0) {
                        console.log('\n El monto a retirar debe ser mayor a 0.\n');
                    }
                }

                // Generación de ID propio de la colección Withdraw (W-001, W-002...)
                const idTx = await withdrawRepo.obtenerSiguienteId();
                const tx = cuentaObj.retirar(monto, idTx);

                if (!tx) {
                    console.log('\n Transacción rechazada: Saldo insuficiente.');
                    console.log(`Saldo actual disponible: Q${cuentaObj.saldo}`);
                } else {
                    await withdrawRepo.guardarRetiro(cuentaObj.numeroCuenta, tx, cuentaObj.saldo);
                    await historyRepo.registrarEnHistorial(cuentaObj.numeroCuenta, tx, cuentaObj.saldo);
                    await cuentaRepo.actualizarSaldo(cuentaObj.numeroCuenta, cuentaObj.saldo);

                    console.log('\n RESUMEN DE RETIRO:');
                    console.log(tx.obtenerResumen());
                    console.log(`Saldo restante: Q${cuentaObj.saldo}`);
                }

                await preguntar('\nPresiona Enter para continuar...');
                break;
            }

            case '4': {
                console.log('\n--- PAGAR SERVICIOS ---');
                const cuentaObj = await autenticar();
                if (!cuentaObj) break;

                let servicio = '';
                while (!servicio) {
                    console.log('\nSeleccione el servicio:');
                    console.log('1. Energía');
                    console.log('2. Agua');
                    console.log('3. Gas');
                    const opcionServicio = await preguntar('Opción (1-3): ');

                    if (opcionServicio === '1') servicio = 'Energía';
                    else if (opcionServicio === '2') servicio = 'Agua';
                    else if (opcionServicio === '3') servicio = 'Gas';
                    else {
                        console.log('\n Opción de servicio no válida. Intente de nuevo.');
                    }
                }

                let referencia = '';
                while (!referencia) {
                    referencia = (await preguntar(`Ingrese la referencia de ${servicio}: `)).trim();
                    if (!referencia) console.log('\n La referencia es obligatoria.\n');
                }

                let monto = 0;
                while (isNaN(monto) || monto <= 0) {
                    monto = parseFloat(await preguntar(`Monto a pagar por ${servicio}: Q`));
                    if (isNaN(monto) || monto <= 0) {
                        console.log('\n El monto a pagar debe ser mayor a 0.\n');
                    }
                }

                // Utiliza la referencia ingresada por el usuario como ID de la transacción
                const idTx = referencia;
                const tx = cuentaObj.pagarServicio(monto, servicio, referencia, idTx);

                if (!tx) {
                    console.log('\n Transacción rechazada: Saldo insuficiente para pagar el servicio.');
                } else {
                    await servicesRepo.guardarPagoServicio(cuentaObj.numeroCuenta, tx, cuentaObj.saldo);
                    await historyRepo.registrarEnHistorial(cuentaObj.numeroCuenta, tx, cuentaObj.saldo);
                    await cuentaRepo.actualizarSaldo(cuentaObj.numeroCuenta, cuentaObj.saldo);

                    console.log('\n RESUMEN DE PAGO DE SERVICIO:');
                    console.log(tx.obtenerResumen());
                    console.log(`Saldo restante: Q${cuentaObj.saldo}`);
                }

                await preguntar('\nPresiona Enter para continuar...');
                break;
            }

            case '5': {
                console.log('\n--- VER MOVIMIENTOS BANCARIOS ---');
                const cuentaObj = await autenticar();
                if (!cuentaObj) break;

                console.log(`\n HISTORIAL DE MOVIMIENTOS DE LA CUENTA #${cuentaObj.numeroCuenta} (${cuentaObj.nombre}):`);

                const movimientosGuardados = await historyRepo.obtenerMovimientos(cuentaObj.numeroCuenta);

                if (movimientosGuardados.length === 0) {
                    console.log('No hay movimientos registrados en la colección History para esta cuenta.');
                } else {
                    movimientosGuardados.forEach(item => {
                        console.log(`${item.transaccion.obtenerResumen()} | Saldo Tras Op: Q${item.saldoResultante}`);
                    });
                }
                console.log(`Saldo Actual Registrado: Q${cuentaObj.saldo}`);

                await preguntar('\nPresiona Enter para continuar...');
                break;
            }

            case '6': {
                console.log('\n¡Gracias por usar Acme Bank! Hasta luego.');
                salir = true;
                await dbInstance.cerrar();
                rl.close();
                break;
            }

            default:
                console.log('\n Opción no válida. Intente con un número de 1 a 6.');
                break;
        }
    }
}

// Ejecutar programa
menuPrincipal();