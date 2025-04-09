import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { CreatePostDto } from 'src/domain/post/dto/create-post.dto';
import { UpdatePostDto } from 'src/domain/post/dto/update-post.dto';
import { Comment } from 'src/domain/post/entities/comment.entity';
import { Post } from 'src/domain/post/entities/post.entity';
import { User } from 'src/domain/user/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  //?-------------------------------------------------------------------------//
  //? CREATE
  //?-------------------------------------------------------------------------//

  async create(dto: CreatePostDto): Promise<Post> {
    const post = this.postRepository.create(dto);
    return await this.postRepository.save(post);
  }

  // async seedDummyData() {
  //   const users = [];
  //   for (let i = 0; i < 10; i++) {
  //     const user = this.userRepository.create({
  //       username: faker.internet.userName(),
  //       uuid: faker.string.uuid(),
  //       email: faker.internet.email(),
  //       level: 0,
  //     });
  //     users.push(await this.userRepository.save(user));
  //   }
  //   for (let i = 0; i < 300; i++) {
  //     const post = this.postRepository.create({
  //       userId: users[Math.floor(Math.random() * users.length)].id,
  //       category: faker.helpers.arrayElement(Object.values(PostType)),
  //       title: faker.lorem.sentence().slice(0, 63).trim(),
  //       body: faker.lorem.paragraphs(),
  //       isPrivate: faker.datatype.boolean(),
  //     });
  //     const savedPost = await this.postRepository.save(post);
  //     const commentCount = Math.floor(Math.random() * 13);
  //     for (let j = 0; j < commentCount; j++) {
  //       const comment = this.commentRepository.create({
  //         userId: users[Math.floor(Math.random() * users.length)].id,
  //         postId: savedPost.id,
  //         body: faker.lorem.sentence(),
  //       });
  //       if (j > 0 && Math.random() < 0.2) {
  //         const parentComment = await this.commentRepository.findOne({
  //           where: { postId: savedPost.id },
  //         });
  //         if (parentComment) {
  //           comment.parentId = parentComment.id;
  //         }
  //       }
  //       await this.commentRepository.save(comment);
  //     }
  //   }
  // }

  //?-------------------------------------------------------------------------//
  //? READ
  //?-------------------------------------------------------------------------//

  async findAll(query: PaginateQuery): Promise<Paginated<Post>> {
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .loadRelationCountAndMap('post.commentCount', 'post.comments')
      .orderBy('post.id', 'DESC');

    return await paginate(query, queryBuilder, {
      sortableColumns: ['id', 'title', 'isPrivate'],
      searchableColumns: ['title', 'body'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        category: [FilterOperator.EQ],
        isPrivate: [FilterOperator.EQ],
      },
    });
  }

  async find(): Promise<Post[]> {
    return await this.postRepository
      .createQueryBuilder('post')
      .orderBy('id', 'DESC')
      .getMany();
  }

  async findById(id: number, relations: string[] = []): Promise<Post> {
    try {
      return relations.length > 0
        ? await this.postRepository.findOneOrFail({
            where: { id },
            relations,
          })
        : await this.postRepository.findOneOrFail({
            where: { id },
          });
    } catch (error) {
      console.error(error);
      throw new NotFoundException('entity not found');
    }
  }

  //?-------------------------------------------------------------------------//
  //? UPDATE
  //?-------------------------------------------------------------------------//

  async update(id: number, dto: UpdatePostDto): Promise<Post> {
    const post = await this.postRepository.preload({ id, ...dto });
    if (!post) {
      throw new NotFoundException(`entity not found`);
    }
    return await this.postRepository.save(post);
  }

  //?-------------------------------------------------------------------------//
  //? DELETE
  //?-------------------------------------------------------------------------//

  // note that this is hard-delete
  async remove(id: number): Promise<Post> {
    const post = await this.findById(id);
    return await this.postRepository.remove(post);
  }
}
