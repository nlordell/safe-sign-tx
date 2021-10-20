import { ethers } from "./lib/ethers.js";

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const GNOSIS_SAFE = new ethers.utils.Interface([
"function execTransaction(\
  address to,\
  uint256 value,\
  bytes calldata data,\
  uint8 operation,\
  uint256 safeTxGas,\
  uint256 baseGas,\
  uint256 gasPrice,\
  address gasToken,\
  address payable refundReceiver,\
  bytes memory signatures\
) public payable returns (bool success)",
]);

function handleError(inner) {
  return () =>
    Promise.resolve(inner()).catch((err) => {
      console.error(err);
      alert(err.message);
    });
}

function flagSignature(signature, flag) {
  const { r, s, v } = ethers.utils.splitSignature(signature);
  return ethers.utils.solidityPack(
    ["bytes32", "bytes32", "uint8"],
    [r, s, flag(v)],
  );
}

function readTx() {
  return {
    to: document.querySelector("#to").value,
    value: document.querySelector("#value").value,
    data: document.querySelector("#data").value,
    operation: document.querySelector("#operation").value,
    safeTxGas: document.querySelector("#safeTxGas").value,
    baseGas: document.querySelector("#baseGas").value,
    gasPrice: document.querySelector("#gasPrice").value,
    gasToken: document.querySelector("#gasToken").value,
    refundReceiver: document.querySelector("#refundReceiver").value,
    nonce: document.querySelector("#nonce").value,
  };
}

const SAFE_TX_TYPE = [
  { name: "to", type: "address" },
  { name: "value", type: "uint256" },
  { name: "data", type: "bytes" },
  { name: "operation", type: "uint8" },
  { name: "safeTxGas", type: "uint256" },
  { name: "baseGas", type: "uint256" },
  { name: "gasPrice", type: "uint256" },
  { name: "gasToken", type: "address" },
  { name: "refundReceiver", type: "address" },
  { name: "nonce", type: "uint256" },
];

document.querySelector("#sign").addEventListener(
  "click",
  handleError(async () => {
    await ethereum.request({ method: "eth_requestAccounts" });

    const { chainId } = await provider.getNetwork();
    const domain = {
      chainId,
      verifyingContract: document.querySelector("#safe").value,
    };
    const tx = readTx();
    const signingScheme = document.querySelector("#signingScheme").value;

    let signature;
    switch (signingScheme) {
      case "eip712":
        signature = await signer._signTypedData(
          domain,
          { SafeTx: SAFE_TX_TYPE },
          tx,
        );
        break;
      case "ethsign":
        signature = flagSignature(
          await signer.signMessage(
            ethers.utils.arrayify(
              ethers.utils._TypedDataEncoder.hash(
                domain,
                { SafeTx: SAFE_TX_TYPE },
                tx,
              ),
            ),
          ),
          (v) => v + 4,
        );
        break;
      case "validator":
        signature = ethers.utils.solidityPack(
          ["uint256", "uint256", "uint8"],
          [await signer.getAddress(), 0, 1],
        );
        break;
    }

    alert(signature);
  }),
);

document.querySelector("#execute").addEventListener(
  "click",
  handleError(async () => {
    await ethereum.request({ method: "eth_requestAccounts" });

    const safe = new ethers.Contract(
      document.querySelector("#safe").value,
      GNOSIS_SAFE,
      signer,
    );
    const tx = readTx();

    const receipt = await safe.execTransaction(
      tx.to,
      tx.value,
      tx.data,
      tx.operation,
      tx.safeTxGas,
      tx.baseGas,
      tx.gasPrice,
      tx.gasToken,
      tx.refundReceiver,
      document.querySelector("#signatures").value,
    );

    alert(receipt.hash);
  }),
);
