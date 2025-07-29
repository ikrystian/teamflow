import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'krystian@bpcoders.pl' }
    })

    if (existingAdmin) {
      // Update existing user to admin role
      const updatedUser = await prisma.user.update({
        where: { email: 'krystian@bpcoders.pl' },
        data: { role: 'admin' }
      })
      console.log('✅ Updated existing user to admin:', updatedUser.email)
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('admin123', 12)
      
      const adminUser = await prisma.user.create({
        data: {
          name: 'Krystian Admin',
          email: 'krystian@bpcoders.pl',
          password: hashedPassword,
          role: 'admin'
        }
      })
      console.log('✅ Created new admin user:', adminUser.email)
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
