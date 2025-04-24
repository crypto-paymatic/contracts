import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PaymaticPayments", (m) => {
  const paymaticPayments = m.contract("PaymaticPayments", ["0x992cb39afb1f08695da091Fa639c6dE883195c3B"]);

  return { paymaticPayments };
});
