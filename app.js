import readline from 'readline';
import { stdin as input, stdout as output } from 'process';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// --- HELPER PARA LEER ENTRADA DE USUARIO CON PROMESAS ---
const preguntar = (mensaje) => new Promise((resolve) => rl.question(mensaje, resolve));


// 1. Herencia y polimorfismo (clases de transacciones)

// --- Clase padre (BASE) ---
class Transaccion {
    constructor(id, monto, tipo) {
        this.id = id;
        this.monto = monto;
        this.tipo = tipo;
        this.fecha = new Date().toLocaleString(); 
    }

    obtenerResumen() {
        return `${this.fecha} ID: #${this.id} | Tipo: ${this.tipo} | Monto: Q${this.monto}`;
    }
}

// Clases hijas (Herencia)

class Consignacion extends Transaccion {
    constructor(id, monto) {
        super(id, monto, 'Consignacion');
    }

    obtenerResumen() {
        return `${super.obtenerResumen()} | Estado: Exitosa (Abono)`;
    }
}

class Retiro extends Transaccion {
    constructor(id, monto) {
        super(id, monto, 'Retiro');
    }

    obtenerResumen() {
        return `${super.obtenerResumen()} | Estado: Exitosa (Debito)`;
    }
}

class PagoServicio extends Transaccion {
    constructor(id, monto, servicio, referencia) {
        super(id, monto, `Pago de ${servicio}`);
        this.servicio = servicio;
        this.referencia = referencia;
    }

    obtenerResumen() {
        return `${super.obtenerResumen()} | Ref: ${this.referencia}`;
    }
}

// 2. Clase cuenta

class Cuenta {
    constructor(numeroCuenta, documento, nombre, clave) {
        this.numeroCuenta = numeroCuenta;
        this.documento = documento;
        this.nombre = nombre;
        this.clave = clave;
        this.saldo = 0;
        this.movimientos = [];
    }

    validarClave(claveIngresada) {
        return this.clave === claveIngresada;
    }

    depositar(monto, idTransaccion) {
        this.saldo += monto;
        const transaccion = new Consignacion(idTransaccion, monto);
        this.movimientos.push(transaccion);
        return transaccion;
    }

    retirar(monto, idTransaccion) {
        if (monto > this.saldo) {
            return null;
        }
        this.saldo -= monto;
        const transaccion = new Retiro(idTransaccion, monto);
        this.movimientos.push(transaccion);
        return transaccion;
    }

    pagarServicio(monto, servicio, referencia, idTransaccion) {
        if (monto > this.saldo) {
            return null;
        }
        this.saldo -= monto;
        const transaccion = new PagoServicio(idTransaccion, monto, servicio, referencia);
        this.movimientos.push(transaccion);
        return transaccion;
    }
}

// 3. Variables globales del sistema 

const cuentas = [];
let contadorCuenta = 1001;
let contadorTransaccion = 1;

// Renombrado a autenticar() para coincidir con la llamada en las opciones 3, 4 y 5
async function autenticar() {
    if (cuentas.length === 0) {
        console.log('\n No hay cuentas registradas en el sistema.');
        await preguntar('\nPresiona enter para continuar...');
        return null;
    }

    while (true) {
        const numCuenta = parseInt(await preguntar("Ingrese su numero de cuenta: "));
        const clave = await preguntar('Ingrese su clave: ');

        const cuentaEncontrada = cuentas.find(c => c.numeroCuenta === numCuenta);

        if (!cuentaEncontrada) {
            console.log('\n La cuenta ingresada no existe. Intente de nuevo.\n');
            continue;
        }
        if (!cuentaEncontrada.validarClave(clave)) {
            console.log('\n Clave incorrecta. Intente de nuevo.\n');
            continue;
        }
        return cuentaEncontrada;
    }
}

// 4. Menu principal y navegacion 

async function menuPrincipal() {
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
                    doc = (await preguntar('Numero de documento: ')).trim();
                    if (!doc || !regexAlfanumerico.test(doc)) {
                        console.log('\n El numero de documento solo debe contener letras y numeros (sin caracteres especiales).\n');
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

                const nuevaCuenta = new Cuenta(contadorCuenta, doc, nombre, clave);
                cuentas.push(nuevaCuenta);

                console.log('\n Cuenta creada exitosamente');
                console.log(`Su numero de cuenta asignado es: ${contadorCuenta}`);
                contadorCuenta++;
                
                await preguntar('\nPresiona enter para continuar...');
                break;
            }

            case '2': {
                console.log('\n--- CONSIGNAR DINERO ---');
                
                if (cuentas.length === 0) {
                    console.log('\n No hay cuentas registradas en el sistema.');
                    await preguntar('\nPresiona enter para continuar...');
                    break;
                }

                let cuentaObj = null;
                while (!cuentaObj) {
                    const num = parseInt(await preguntar('Ingrese numero de cuenta destino: '));
                    cuentaObj = cuentas.find(c => c.numeroCuenta === num);
                    if (!cuentaObj) {
                        console.log('\n La cuenta destino no existe. Intente de nuevo.\n');
                    }
                }

                let monto = 0;
                while (isNaN(monto) || monto <= 0) {
                    monto = parseFloat(await preguntar('Monto a consignar: Q'));
                    if (isNaN(monto) || monto <= 0) {
                        console.log('\n El monto debe ser un numero mayor a 0.\n');
                    }
                }

                const tx = cuentaObj.depositar(monto, contadorTransaccion++);

                console.log('\n RESUMEN DE TRANSACCION: ');
                console.log(tx.obtenerResumen());
                console.log(`Saldo actual de la cuenta: Q${cuentaObj.saldo}`);
                
                await preguntar('\nPresiona enter para continuar...');
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

                const tx = cuentaObj.retirar(monto, contadorTransaccion++);

                if (!tx) {
                    console.log('\n Transaccion rechazada: Saldo insuficiente.');
                    console.log(`Saldo actual disponible: Q${cuentaObj.saldo}`);
                } else {
                    console.log('\n RESUMEN DE TRANSACCION: ');
                    console.log(tx.obtenerResumen());
                    console.log(`Saldo restante: Q${cuentaObj.saldo}`);
                }

                await preguntar('\nPresiona enter para continuar...');
                break;
            }

            case '4': {
                console.log('\n--- PAGAR SERVICIOS ---');
                const cuentaObj = await autenticar();
                if (!cuentaObj) break;

                let servicio = '';
                while (!servicio) {
                    console.log('\nSeleccione el servicio:');
                    console.log('1. Energia');
                    console.log('2. Agua');
                    console.log('3. Gas');
                    const opcionServicio = await preguntar('Opcion (1-3): ');

                    if (opcionServicio === '1') servicio = 'Energia';
                    else if (opcionServicio === '2') servicio = 'Agua';
                    else if (opcionServicio === '3') servicio = 'Gas';
                    else {
                        console.log('\n Opcion de servicio no valida. Intente de nuevo.');
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

                const tx = cuentaObj.pagarServicio(monto, servicio, referencia, contadorTransaccion++);

                if (!tx) {
                    console.log('\n Transaccion rechazada: Saldo insuficiente para pagar el servicio.');
                } else {
                    console.log('\n RESUMEN DE TRANSACCION: ');
                    console.log(tx.obtenerResumen());
                    console.log(`Saldo restante: Q${cuentaObj.saldo}`);
                }

                await preguntar('\nPresiona enter para continuar...');
                break;
            }

            case '5': {
                console.log('\n--- VER MOVIMIENTOS BANCARIOS ---');
                const cuentaObj = await autenticar();
                if (!cuentaObj) break;

                console.log(`\n MOVIMIENTOS DE LA CUENTA #${cuentaObj.numeroCuenta} (${cuentaObj.nombre}):`);

                if (cuentaObj.movimientos.length === 0) {
                    console.log('No hay movimientos registrados en esta cuenta.');
                } else {
                    cuentaObj.movimientos.forEach(tx => {
                        console.log(tx.obtenerResumen());
                    });
                }
                console.log(`Saldo Total: Q${cuentaObj.saldo}`);

                await preguntar('\nPresiona enter para continuar...');
                break;
            }

            case '6': {
                console.log('\nGracias por usar Acme Bank! Hasta luego.');
                salir = true;
                rl.close();
                break;
            }

            default:
                console.log('\n Opción no válida. Intente con un número de 1 a 6.');
                break;
        }
    }
}

// Ejecutamos el programa
menuPrincipal();