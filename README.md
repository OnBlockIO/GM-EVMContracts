
# GhostMarket Token Contracts

## Deployed Contracts on BSC:

#### OnBlockVesting
https://bscscan.com/address/0xFC2eb99ABAe550903a41DafCb6D797BcD0D88758

#### GhostMarketToken
https://bscscan.com/address/0x42bD1B1c84aD8Cf576D25FCd86A7EFbE2752Fe02

#### ProxyAdmin
https://bscscan.com/address/0xC200F605Ee4b8a151532e8691f33AF8cC26EB99f

#### TransparentUpgradeableProxy
https://bscscan.com/address/0x0B53b5dA7d0F275C31a6A182622bDF02474aF253

## Deployed Contracts on Polygon:

#### GhostMarketToken
https://polygonscan.com/address/0x68F50816df86F7a2f720deFfFF2395a9F1675585

#### ProxyAdmin
https://polygonscan.com/address/0x1bb6C21e6adB8757F46e77A7F4c5Ad9118f4A04d

#### TransparentUpgradeableProxy
https://polygonscan.com/address/0x6a335AC6A3cdf444967Fe03E7b6B273c86043990

## Deployed Contracts on Avalanche:

#### GhostMarketERC721
https://snowtrace.io/address/0x068bef92987d16ef682ff017b822ca1211401eaf

#### GhostMarketERC1155
https://snowtrace.io/address/0xdcdab251151c345ad527851eca783521ea3209e0

#### GhostMarketToken
https://snowtrace.io/address/0x42bD1B1c84aD8Cf576D25FCd86A7EFbE2752Fe02

#### ProxyAdmin
https://snowtraceio/address/0xC200F605Ee4b8a151532e8691f33AF8cC26EB99f
https://snowtrace.io/address/0xf1c82f5ddb4f1a6a8f3eed2eb25fc39fc6d33fb3

#### TransparentUpgradeableProxy
https://snowtrace.io/address/0x0B53b5dA7d0F275C31a6A182622bDF02474aF253
https://snowtrace.io/address/0xf41db445d7eaf45536985ce185ce131fa4b42e68
https://snowtrace.io/address/0x26d583e2cda958b13cc319fad124aa729f8a196e

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



