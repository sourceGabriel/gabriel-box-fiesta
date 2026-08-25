import { PartyServer } from './websocket/ws-server';

const port = Number(process.env.PORT ?? 3000);

const main = async (): Promise<void> => {
  const server = new PartyServer(port);
  await server.start();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
