const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('SerenityPlex', () => {
    let buyer, seller, inspector, lender
    let realEstate, SerenityPlex

    beforeEach(async () => {
        // Setup accounts
        [buyer, seller, inspector, lender] = await ethers.getSigners()

        // Deploy Real Estate
        const RealEstate = await ethers.getContractFactory('RealEstate')
        realEstate = await RealEstate.deploy()

        // Mint 
        let transaction = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS")
        await transaction.wait()

        // Deploy SerenityPlex
        const SerenityPlex = await ethers.getContractFactory('SerenityPlex')
        SerenityPlex = await SerenityPlex.deploy(
            realEstate.address,
            seller.address,
            inspector.address,
            lender.address
        )

        // Approve Property
        transaction = await realEstate.connect(seller).approve(SerenityPlex.address, 1)
        await transaction.wait()

        // List Property
        transaction = await SerenityPlex.connect(seller).list(1, buyer.address, tokens(10), tokens(5))
        await transaction.wait()
    })

    describe('Deployment', () => {
        it('Returns NFT address', async () => {
            const result = await SerenityPlex.nftAddress()
            expect(result).to.be.equal(realEstate.address)
        })

        it('Returns seller', async () => {
            const result = await SerenityPlex.seller()
            expect(result).to.be.equal(seller.address)
        })

        it('Returns inspector', async () => {
            const result = await SerenityPlex.inspector()
            expect(result).to.be.equal(inspector.address)
        })

        it('Returns lender', async () => {
            const result = await SerenityPlex.lender()
            expect(result).to.be.equal(lender.address)
        })
    })

    describe('Listing', () => {
        it('Updates as listed', async () => {
            const result = await SerenityPlex.isListed(1)
            expect(result).to.be.equal(true)
        })

        it('Returns buyer', async () => {
            const result = await SerenityPlex.buyer(1)
            expect(result).to.be.equal(buyer.address)
        })

        it('Returns purchase price', async () => {
            const result = await SerenityPlex.purchasePrice(1)
            expect(result).to.be.equal(tokens(10))
        })

        it('Returns SerenityPlex amount', async () => {
            const result = await SerenityPlex.SerenityPlexAmount(1)
            expect(result).to.be.equal(tokens(5))
        })

        it('Updates ownership', async () => {
            expect(await realEstate.ownerOf(1)).to.be.equal(SerenityPlex.address)
        })
    })

    describe('Deposits', () => {
        beforeEach(async () => {
            const transaction = await SerenityPlex.connect(buyer).depositEarnest(1, { value: tokens(5) })
            await transaction.wait()
        })

        it('Updates contract balance', async () => {
            const result = await SerenityPlex.getBalance()
            expect(result).to.be.equal(tokens(5))
        })
    })

    describe('Inspection', () => {
        beforeEach(async () => {
            const transaction = await SerenityPlex.connect(inspector).updateInspectionStatus(1, true)
            await transaction.wait()
        })

        it('Updates inspection status', async () => {
            const result = await SerenityPlex.inspectionPassed(1)
            expect(result).to.be.equal(true)
        })
    })

    describe('Approval', () => {
        beforeEach(async () => {
            let transaction = await SerenityPlex.connect(buyer).approveSale(1)
            await transaction.wait()

            transaction = await SerenityPlex.connect(seller).approveSale(1)
            await transaction.wait()

            transaction = await SerenityPlex.connect(lender).approveSale(1)
            await transaction.wait()
        })

        it('Updates approval status', async () => {
            expect(await SerenityPlex.approval(1, buyer.address)).to.be.equal(true)
            expect(await SerenityPlex.approval(1, seller.address)).to.be.equal(true)
            expect(await SerenityPlex.approval(1, lender.address)).to.be.equal(true)
        })
    })

    describe('Sale', () => {
        beforeEach(async () => {
            let transaction = await SerenityPlex.connect(buyer).depositEarnest(1, { value: tokens(5) })
            await transaction.wait()

            transaction = await SerenityPlex.connect(inspector).updateInspectionStatus(1, true)
            await transaction.wait()

            transaction = await SerenityPlex.connect(buyer).approveSale(1)
            await transaction.wait()

            transaction = await SerenityPlex.connect(seller).approveSale(1)
            await transaction.wait()

            transaction = await SerenityPlex.connect(lender).approveSale(1)
            await transaction.wait()

            await lender.sendTransaction({ to: SerenityPlex.address, value: tokens(5) })

            transaction = await SerenityPlex.connect(seller).finalizeSale(1)
            await transaction.wait()
        })

        it('Updates ownership', async () => {
            expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address)
        })

        it('Updates balance', async () => {
            expect(await SerenityPlex.getBalance()).to.be.equal(0)
        })
    })
})