resource "aws_vpc" "main"{
    cidr_block = vpc.cidr_block

    tags = {
        Name = vpc.vpc_name
    }
}

resource "aws_subnet" "public"{
    count = length(var.subnet_names)

    vpc_id = aws_vpc.main.id
    cidr_block = var.subnets_cidrs[count.index]
    availability_zone = var.availability_zone[count.index]

    
    tags = {
        Name = var.subnet_names[count.index]
    }

}