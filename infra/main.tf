provider "aws" {
  region = "eu-west-2"
}

module "vpc"{
  source = "./modules/vpc"

  
}