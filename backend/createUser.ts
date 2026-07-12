/// <reference types="node" />
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const rolEvaluador = await prisma.rol.findUnique({
    where: { rol_name: 'Evaluador' }
  })

  if (!rolEvaluador) {
    throw new Error('Rol Evaluador no encontrado. Ejecuta el seed primero.')
  }

  const passwordHash = await bcrypt.hash('User1234!', 12)
  const newUser = await prisma.usuario.upsert({
    where: { email: 'user@guios.pro' },
    update: {},
    create: {
      rol_id: rolEvaluador.rol_id,
      usuario_name: 'Usuario Evaluador',
      email: 'user@guios.pro',
      password_hash: passwordHash,
      activo: true,
    },
  })
  
  console.log('Usuario creado exitosamente:')
  console.log(`Email: ${newUser.email}`)
  console.log(`Contraseña: User1234!`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
