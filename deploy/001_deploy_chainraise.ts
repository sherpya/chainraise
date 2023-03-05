import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function ({ deployments: { deploy }, getNamedAccounts }) {
    const { deployer } = await getNamedAccounts();

    await deploy('ChainRaise', {
        from: deployer,
        log: true,
        deterministicDeployment: true
    })
}

export default func;
func.tags = ['ChainRaise'];
