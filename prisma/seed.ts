import { PrismaService } from '../src/infra/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaService();

async function main() {
    const email = 'test@example.com';
    const login = 'test';
    const password = '12345678';

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: { login, password: hashedPassword },
        create: {
            email,
            login,
            password: hashedPassword,
        },
    });

    console.log(`Seed user created: id=${user.id}, email=${user.email}, login=${user.login}`);
    console.log(`Use these credentials:`);
    console.log(`  Front-end: ${email} / ${password}`);
    console.log(`  API:       ${login} / ${password}`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });