
# GhostMarket ERC20 & Vesting Contracts

## Deployed Contracts on BSC:

#### OnBlockVesting
https://bscscan.com/address/

#### GhostMarketToken
https://bscscan.com/address/0x42bD1B1c84aD8Cf576D25FCd86A7EFbE2752Fe02

#### ProxyAdmin
https://bscscan.com/address/0xC200F605Ee4b8a151532e8691f33AF8cC26EB99f

#### TransparentUpgradeableProxy
https://bscscan.com/address/0x0B53b5dA7d0F275C31a6A182622bDF02474aF253

## Deployed Contracts on Polygon:

#### GhostMarketToken
https://polygonscan.com/address/

#### ProxyAdmin
https://polygonscan.com/address/

#### TransparentUpgradeableProxy
https://polygonscan.com/address/

## Deployed Contracts on Avalanche:

#### GhostMarketToken
https://snowtrace.io/address/0x42bD1B1c84aD8Cf576D25FCd86A7EFbE2752Fe02

#### ProxyAdmin
https://snowtraceio/address/0xC200F605Ee4b8a151532e8691f33AF8cC26EB99f

#### TransparentUpgradeableProxy
https://snowtrace.io/address/0x0B53b5dA7d0F275C31a6A182622bDF02474aF253

## Deployed Contracts on Ethereum:

#### GhostMarketToken
https://etherscan.com/address/0x42bD1B1c84aD8Cf576D25FCd86A7EFbE2752Fe02

#### ProxyAdmin
https://etherscan.com/address/0xA93Ae78470b46c75523aCBACfc68246Bf2Eb68ce

#### TransparentUpgradeableProxy
https://etherscan.com/address/0x35609dC59E15d03c5c865507e1348FA5abB319A8

## Audit

https://www.certik.com/projects/ghostmarket

## Technical Information

Upgradable ERC20 Contract.
Non-upgradable Vesting Contract.
Using OpenZeppelin contracts.

### Compiling contracts
```
truffle compile --all
```

### Deploying Proxy

Using Truffle to deploying Proxy
```
contracts/Migrations.sol
```
Contracts can be deployed with
```
truffle deploy --network <network_name>
```
For local deployment ganache must be started and private keys saved into

```
.secrets.json
```

local deployment:
```
truffle deploy --network development
```

testnet deployment:
```
truffle deploy --network <TESTNET_NAME>
```

mainnet deployment:
```
truffle deploy --network <MAINNET_NAME>
```

## Testing

tests can be run with:

local deployment:
```
truffle test --network development
```

testnet deployment:
```
truffle test --network <TESTNET_NAME>
```

## Verify

```
truffle run verify GhostMarketToken@<CONTRACT_HASH> --network <NETWORK_NAME>
```



