resource "aws_vpc" "main"{
    cidr_block = vpc.cidr_block

    tags = {
        Name = vpc.vpc_name
    }
}

resource "subnets" "publuc"{
    subnet_names =
}